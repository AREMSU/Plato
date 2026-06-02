
from django.contrib.auth.models import AbstractUser
from django.db import models
import random
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    university = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.URLField(blank=True)
    rating = models.FloatField(default=0.0)
    meals_shared = models.IntegerField(default=0)
    email = models.EmailField(unique=True)
    notify_new_meals = models.BooleanField(default=True)
    notify_booking_updates = models.BooleanField(default=True)
    notify_reminders = models.BooleanField(default=True)
    notify_promotions = models.BooleanField(default=False)
    notify_reviews = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='api_users',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='api_users',
        blank=True
    )

    def __str__(self):
        return self.email


class Meal(models.Model):
    CATEGORIES = [
        ('Nepali', 'Nepali'),
        ('Continental', 'Continental'),
        ('Chinese', 'Chinese'),
        ('Snacks', 'Snacks'),
        ('Breakfast', 'Breakfast'),
    ]
    
    STATUS_CHOICES = [
    ('pending_review', 'Pending Review'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORIES, default='Nepali')
    price_per_portion = models.FloatField()
    total_portions = models.IntegerField()
    available_portions = models.IntegerField()     
    bookings = models.IntegerField(default=0)
    is_vegetarian = models.BooleanField(default=False)
    image = models.URLField(blank=True)
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meals')
    pickup_time = models.CharField(max_length=100)
    pickup_location = models.CharField(max_length=200)
    meal_date = models.DateField()
    tags = models.JSONField(default=list)
    rating = models.FloatField(default=0.0)
    reviews = models.IntegerField(default=0)
    calories = models.IntegerField(default=400)
    protein = models.IntegerField(default=15)
    created_at = models.DateTimeField(auto_now_add=True)
    is_featured = models.BooleanField(default=False)

    def __str__(self):
        return self.title
 

class Booking(models.Model):
    STATUS = [
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]

    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='meal_bookings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    portions = models.IntegerField()
    total_cost = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS, default='confirmed')
    booked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} booked {self.meal.title}"


class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='reviews_list')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reviewer.email} → {self.seller.email} ({self.rating})"


class Notification(models.Model):
    CATEGORY_CHOICES = [
        ('new_meals', 'New Meals'),
        ('booking_updates', 'Booking Updates'),
        ('reminders', 'Reminders'),
        ('promotions', 'Promotions'),
        ('reviews', 'Reviews'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} — {self.title}"
    


class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps', null=True, blank=True)
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    temp_data = models.TextField(blank=True, null=True)  # ← add this

    def is_valid(self):
        expiry = self.created_at + timedelta(minutes=5)
        return timezone.now() < expiry and not self.is_used

    @staticmethod
    def generate_otp():
        return str(random.randint(100000, 999999))

    def __str__(self):
        return f"{self.email} - {self.code}"
    

    # Add to api/models.py

class Subscription(models.Model):
    PLANS = [
        ('free', 'Free'),
        ('pro', 'Pro'),
    ]
    STATUS_CHOICES = [
        ('none', 'None'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=PLANS, default='free')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='none')
    is_active = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Mock payment fields (replace with real later)
    payment_reference = models.CharField(max_length=200, blank=True)
    amount_paid = models.FloatField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_pro(self):
        if self.plan == 'pro' and self.is_active:
            # Check not expired
            if self.expires_at and timezone.now() < self.expires_at:
                return True
        return False

    def days_remaining(self):
        if self.expires_at and self.is_active:
            delta = self.expires_at - timezone.now()
            return max(0, delta.days)
        return 0

    def __str__(self):
        return f"{self.user.email} — {self.plan}"