from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Subscription, Meal

class Command(BaseCommand):
    help = 'Expire pro subscriptions that have passed their end date'

    def handle(self, *args, **kwargs):
        expired = Subscription.objects.filter(
            plan='pro',
            is_active=True,
            expires_at__lt=timezone.now()
        )

        count = expired.count()
        for sub in expired:
            sub.is_active = False
            sub.plan = 'free'
            sub.save()
            # Unfeature their meals
            Meal.objects.filter(seller=sub.user).update(is_featured=False)
            self.stdout.write(f'Expired: {sub.user.email}')

        self.stdout.write(f'Done. {count} subscription(s) expired.')
        