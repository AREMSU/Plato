from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from api.models import User, Subscription, Meal
import datetime
from unittest.mock import patch


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


class MealTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='seller@example.com',
            username='seller@example.com',
            password='password123'
        )
        self.buyer = User.objects.create_user(
            email='buyer@example.com',
            username='buyer@example.com',
            password='password123'
        )
        self.admin = User.objects.create_superuser(
            email='admin2@example.com',
            username='admin2@example.com',
            password='password123'
        )
        self.meal_data = {
            'title': 'Test Pizza',
            'description': 'Delicious pepperoni pizza',
            'category': 'Snacks',
            'price_per_portion': 10.5,
            'total_portions': 5,
            'is_vegetarian': False,
            'image': 'https://res.cloudinary.com/dy3zdsgxs/image/upload/v12345/pizza.jpg',
            'pickup_time': '12:00 PM',
            'pickup_location': '123 Food St',
            'meal_date': str(timezone.now().date() + datetime.timedelta(days=1)),
            'calories': 500,
            'protein': 20,
        }

    @patch('api.views.classify_food_image')
    def test_meal_creation_approved(self, mock_classify):
        mock_classify.return_value = {
            'verdict': 'approved',
            'confidence': 0.95,
            'labels_detected': ['pizza', 'food'],
            'reason': 'Image verified as food'
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/meals/', self.meal_data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'approved')
        
        # Check in DB
        meal = Meal.objects.get(id=response.data['id'])
        self.assertEqual(meal.status, 'approved')

    @patch('api.views.classify_food_image')
    def test_meal_creation_pending(self, mock_classify):
        mock_classify.return_value = {
            'verdict': 'pending_review',
            'confidence': 0.55,
            'labels_detected': ['pizza'],
            'reason': 'Image verification is inconclusive'
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/meals/', self.meal_data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending_review')
        
        # Check in DB
        meal = Meal.objects.get(id=response.data['id'])
        self.assertEqual(meal.status, 'pending_review')

    @patch('api.views.classify_food_image')
    def test_meal_creation_rejected(self, mock_classify):
        mock_classify.return_value = {
            'verdict': 'rejected',
            'confidence': 0.25,
            'labels_detected': ['mug'],
            'reason': 'This does not look like food'
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/meals/', self.meal_data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)

    def test_buyer_feed_only_approved(self):
        # Create meals directly in database
        today = timezone.now().date()
        future_date = today + datetime.timedelta(days=2)
        
        approved_meal = Meal.objects.create(
            seller=self.user,
            title='Approved Pizza',
            description='Tasty pizza',
            category='Snacks',
            price_per_portion=10,
            total_portions=5,
            available_portions=5,
            meal_date=future_date,
            status='approved'
        )
        
        pending_meal = Meal.objects.create(
            seller=self.user,
            title='Pending Pizza',
            description='Tasty pizza',
            category='Snacks',
            price_per_portion=10,
            total_portions=5,
            available_portions=5,
            meal_date=future_date,
            status='pending_review'
        )
        
        rejected_meal = Meal.objects.create(
            seller=self.user,
            title='Rejected Pizza',
            description='Tasty pizza',
            category='Snacks',
            price_per_portion=10,
            total_portions=5,
            available_portions=5,
            meal_date=future_date,
            status='rejected'
        )

        self.client.force_authenticate(user=self.buyer)
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, 200)
        
        # Verify that only the approved meal is in the list
        meal_ids = [m['id'] for m in response.data]
        self.assertIn(approved_meal.id, meal_ids)
        self.assertNotIn(pending_meal.id, meal_ids)
        self.assertNotIn(rejected_meal.id, meal_ids)

    def test_admin_meals_filtering_and_action(self):
        # Create pending review meal
        today = timezone.now().date()
        meal = Meal.objects.create(
            seller=self.user,
            title='Review Pizza',
            description='Tasty pizza',
            category='Snacks',
            price_per_portion=10,
            total_portions=5,
            available_portions=5,
            meal_date=today + datetime.timedelta(days=2),
            status='pending_review'
        )

        self.client.force_authenticate(user=self.admin)
        
        # Test get panel meals with filter
        response = self.client.get('/panel/api/meals/?filter=pending_review')
        self.assertEqual(response.status_code, 200)
        meal_ids = [m['id'] for m in response.data['meals']]
        self.assertIn(meal.id, meal_ids)

        # Test approve action
        action_url = f'/panel/api/meals/{meal.id}/action/'
        response = self.client.post(action_url, {'action': 'approve'}, format='json')
        self.assertEqual(response.status_code, 200)
        
        meal.refresh_from_db()
        self.assertEqual(meal.status, 'approved')

        # Test reject action
        response = self.client.post(action_url, {'action': 'reject'}, format='json')
        self.assertEqual(response.status_code, 200)
        
        meal.refresh_from_db()
        self.assertEqual(meal.status, 'rejected')

