from rest_framework import serializers
from .models import User, Meal, Booking


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    university = serializers.CharField(required=False, allow_blank=True)

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
    name = serializers.SerializerMethodField()
    reliability_badge = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'university',
            'bio', 'avatar', 'rating', 'meals_shared',
            'reliability_badge', 'date_joined'
        ]

    def get_name(self, obj):
        return obj.first_name or obj.email

    def get_reliability_badge(self, obj):
        if obj.rating >= 4.8:
            return 'Top Chef'
        elif obj.rating >= 4.5:
            return 'Trusted'
        elif obj.rating >= 4.0:
            return 'Good'
        return 'New'


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
            'created_at'
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