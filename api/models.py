
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
    



class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps', null=True, blank=True)
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        expiry = self.created_at + timedelta(minutes=5)
        return timezone.now() < expiry and not self.is_used

    @staticmethod
    def generate_otp():
        return str(random.randint(100000, 999999))

    def __str__(self):
        return f"{self.email} - {self.code}"