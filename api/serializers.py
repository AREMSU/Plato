from rest_framework import serializers
from .models import Subscription, User, Meal, Booking, OTP
from .validators import is_disposable_email, has_email_dns


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    university = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        """Block disposable/temporary email domains."""
        if is_disposable_email(value):
            raise serializers.ValidationError(
                'Disposable or temporary email addresses are not allowed. '
                'Please use a real email address.'
            )
        if not has_email_dns(value):
            raise serializers.ValidationError(
                'Email domain does not exist or cannot receive mail. '
                'Please use a real email address.'
            )
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError('Passwords do not match')
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            university=validated_data.get('university', ''),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')
    reliability_badge = serializers.SerializerMethodField()
    is_pro = serializers.SerializerMethodField()
    subscription_expires = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'university', 'bio',
            'avatar', 'rating', 'meals_shared',
            'reliability_badge', 'is_pro', 'subscription_expires',
        ]

    def get_reliability_badge(self, obj):
        if obj.rating >= 4.8: return 'Top Chef'
        if obj.rating >= 4.5: return 'Trusted'
        if obj.rating >= 4.0: return 'Good'
        return 'New'

    def get_is_pro(self, obj):
        try:
            return obj.subscription.is_pro()
        except Exception:
            return False

    def get_subscription_expires(self, obj):
        try:
            return obj.subscription.expires_at
        except Exception:
            return None

class MealSerializer(serializers.ModelSerializer):
    seller_name = serializers.SerializerMethodField()
    seller_avatar = serializers.SerializerMethodField()
    seller_rating = serializers.SerializerMethodField()

    class Meta:
        model = Meal
        fields = [
            'id', 'title', 'description', 'category',
            'price_per_portion', 'total_portions', 'available_portions',
            'bookings', 'is_vegetarian', 'image', 'seller',
            'seller_name', 'seller_avatar', 'seller_rating',
            'pickup_time', 'pickup_location', 'meal_date',
            'tags', 'rating', 'reviews', 'calories', 'protein',
            'created_at', 'is_featured'
        ]
        read_only_fields = [
            'seller', 'available_portions', 'bookings',
            'rating', 'reviews', 'created_at'
        ]

    def get_seller_name(self, obj):
        return obj.seller.first_name or obj.seller.email

    def get_seller_avatar(self, obj):
        return obj.seller.avatar

    def get_seller_rating(self, obj):
        return obj.seller.rating


class BookingSerializer(serializers.ModelSerializer):
    meal = MealSerializer(read_only=True)
    meal_id = serializers.PrimaryKeyRelatedField(
        queryset=Meal.objects.all(), source='meal', write_only=True
    )
    cancellation_fee = serializers.SerializerMethodField()
    refund_amount = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'meal', 'meal_id', 'portions',
            'total_cost', 'status', 'booked_at',
            'cancellation_fee', 'refund_amount'
        ]
        read_only_fields = ['total_cost', 'status', 'booked_at']

    def get_cancellation_fee(self, obj):
        return round(obj.total_cost * 0.3)

    def get_refund_amount(self, obj):
        fee = round(obj.total_cost * 0.3)
        return obj.total_cost - fee
    
class SubscriptionSerializer(serializers.ModelSerializer):
    is_pro = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'is_active', 'is_pro',
            'started_at', 'expires_at', 'days_remaining',
            'payment_reference', 'amount_paid', 'created_at',
        ]

    def get_is_pro(self, obj):
        return obj.is_pro()

    def get_days_remaining(self, obj):
        return obj.days_remaining()