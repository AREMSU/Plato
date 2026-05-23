from django.contrib import admin
from .models import User, Meal, Booking, OTP, Subscription


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'university', 'rating', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'first_name', 'university')
    ordering = ('-date_joined',)


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'price_per_portion', 'available_portions', 'total_portions', 'seller', 'is_featured', 'created_at')
    list_filter = ('category', 'is_vegetarian', 'is_featured')
    search_fields = ('title', 'description', 'seller__email')
    ordering = ('-created_at',)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'meal', 'portions', 'total_cost', 'status', 'booked_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'meal__title')
    ordering = ('-booked_at',)


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'code', 'is_used', 'created_at')
    list_filter = ('is_used',)
    search_fields = ('email',)
    ordering = ('-created_at',)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'is_active', 'amount_paid', 'started_at', 'expires_at')
    list_filter = ('plan', 'is_active')
    search_fields = ('user__email',)
    ordering = ('-created_at',)
