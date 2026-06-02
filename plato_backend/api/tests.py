from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from api.models import User, Subscription
import datetime

class SubscriptionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser@example.com',
            password='password123'
        )
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            username='admin@example.com',
            password='password123'
        )

    def test_upgrade_and_renewal_flow(self):
        # 1. Normal Upgrade Request
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/subscription/upgrade/', {'payment_reference': 'REF-123'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['message'], 'Upgrade request submitted successfully! Waiting for admin approval.')

        sub = Subscription.objects.get(user=self.user)
        self.assertEqual(sub.plan, 'pro')
        self.assertEqual(sub.status, 'pending')
        self.assertFalse(sub.is_active)
        self.assertEqual(sub.payment_reference, 'REF-123')

        # Try submitting another upgrade request when one is already pending
        response2 = self.client.post('/api/subscription/upgrade/', {'payment_reference': 'REF-456'}, format='json')
        self.assertEqual(response2.status_code, 400)

        # 2. Admin Approve Upgrade Request
        self.client.force_authenticate(user=self.admin)
        approve_response = self.client.post(f'/panel/api/subscriptions/{sub.id}/action/', {'action': 'approve'}, format='json')
        self.assertEqual(approve_response.status_code, 200)

        sub.refresh_from_db()
        self.assertEqual(sub.status, 'approved')
        self.assertTrue(sub.is_active)
        self.assertTrue(sub.is_pro())
        self.assertIn(sub.days_remaining(), [29, 30])

        # 3. Renew Subscription Request (User is active Pro)
        self.client.force_authenticate(user=self.user)
        # Attempt renewal
        renew_response = self.client.post('/api/subscription/upgrade/', {'payment_reference': 'REF-RENEW'}, format='json')
        self.assertEqual(renew_response.status_code, 200)
        self.assertEqual(renew_response.data['message'], 'Renewal request submitted successfully! Waiting for admin approval.')

        sub.refresh_from_db()
        # Verify active Pro benefits are still active during pending renewal
        self.assertEqual(sub.status, 'pending')
        self.assertTrue(sub.is_active)
        self.assertTrue(sub.is_pro())
        self.assertEqual(sub.payment_reference, 'REF-RENEW')

        # Try submitting another renewal request while one is already pending
        renew_response2 = self.client.post('/api/subscription/upgrade/', {'payment_reference': 'REF-RENEW-2'}, format='json')
        self.assertEqual(renew_response2.status_code, 400)

        # 4. Admin Approve Renewal Request (Stacking check)
        self.client.force_authenticate(user=self.admin)
        approve_renew_response = self.client.post(f'/panel/api/subscriptions/{sub.id}/action/', {'action': 'approve'}, format='json')
        self.assertEqual(approve_renew_response.status_code, 200)

        sub.refresh_from_db()
        self.assertEqual(sub.status, 'approved')
        self.assertTrue(sub.is_active)
        self.assertTrue(sub.is_pro())
        # Should be approx 60 days remaining (30 remaining + 30 new days)
        self.assertGreaterEqual(sub.days_remaining(), 59)

        # 5. Reject Renewal Request (Let's make another renewal request and reject it)
        self.client.force_authenticate(user=self.user)
        renew_response3 = self.client.post('/api/subscription/upgrade/', {'payment_reference': 'REF-RENEW-3'}, format='json')
        self.assertEqual(renew_response3.status_code, 200)

        self.client.force_authenticate(user=self.admin)
        reject_response = self.client.post(f'/panel/api/subscriptions/{sub.id}/action/', {'action': 'reject'}, format='json')
        self.assertEqual(reject_response.status_code, 200)

        sub.refresh_from_db()
        self.assertEqual(sub.status, 'rejected')
        # Active Pro benefits should STILL be active because expiry is in the future
        self.assertTrue(sub.is_active)
        self.assertTrue(sub.is_pro())

        # 6. Reject when not active Pro (e.g. if we expire it manually)
        sub.expires_at = timezone.now() - datetime.timedelta(days=1)
        sub.is_active = False # Or active but expired
        sub.save()
        self.assertFalse(sub.is_pro())

        # Submit another upgrade
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/subscription/upgrade/', {'payment_reference': 'REF-NEW-UPGRADE'}, format='json')

        # Admin reject it
        self.client.force_authenticate(user=self.admin)
        reject_response2 = self.client.post(f'/panel/api/subscriptions/{sub.id}/action/', {'action': 'reject'}, format='json')
        self.assertEqual(reject_response2.status_code, 200)

        sub.refresh_from_db()
        self.assertEqual(sub.status, 'rejected')
        # Should be inactive since they weren't an active Pro user
        self.assertFalse(sub.is_active)
