from datetime import timedelta

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Avg
import uuid

from api import models
from .models import Subscription, User, Meal, Booking, OTP, Review, Notification
from .ai_views import classify_food_image
from .serializers import (
    RegisterSerializer, SubscriptionSerializer, UserSerializer,
    MealSerializer, BookingSerializer, ReviewSerializer, NotificationSerializer
)
from rest_framework.decorators import api_view, permission_classes
from django.core.mail import send_mail
from django.utils import timezone
import random
from .models import OTP
from django.conf import settings
from .email_service import send_otp_email
from .validators import is_disposable_email
from django.utils import timezone
# ─── AUTH VIEWS ───────────────────────────────────────────────


def should_notify(user, category):
    if category == 'new_meals':
        return user.notify_new_meals
    if category == 'booking_updates':
        return user.notify_booking_updates
    if category == 'reminders':
        return user.notify_reminders
    if category == 'promotions':
        return user.notify_promotions
    if category == 'reviews':
        return user.notify_reviews
    return False


def create_notification(user, category, title, message):
    if not should_notify(user, category):
        return None
    return Notification.objects.create(
        user=user,
        category=category,
        title=title,
        message=message,
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data



        # Check if active user already exists
        if User.objects.filter(email=data['email'], is_active=True).exists():
            return Response({'error': 'Email already exists'}, status=400)

        # Delete any previous inactive user with same email
        User.objects.filter(email=data['email'], is_active=False).delete()

        # Invalidate old OTPs for this email
        OTP.objects.filter(email=data['email'], is_used=False).update(is_used=True)

        # Generate OTP and save temporarily WITHOUT creating user
        otp_code = OTP.generate_otp()
        OTP.objects.create(
            email=data['email'],
            code=otp_code,
        )

        # Store registration data in OTP record temporarily
        import json
        otp = OTP.objects.filter(email=data['email'], is_used=False).latest('created_at')
        otp.temp_data = json.dumps({
            'first_name': data.get('first_name', ''),
            'email': data['email'],
            'password': data['password'],
            'university': data.get('university', ''),
        })
        otp.save()

        # Send OTP email
        # Send OTP email
        result = send_otp_email(data['email'], otp_code, data.get('first_name', ''))

        if not result['success']:
            # Clean up the OTP we just created since email failed
            OTP.objects.filter(email=data['email'], is_used=False).update(is_used=True)

            if result['reason'] == 'email_not_found':
                return Response({
                    'error': 'This email address does not exist. Please use a real email.'
                }, status=400)
            else:
                return Response({
                    'error': 'Failed to send OTP email. Please try again.'
                }, status=500)

        return Response({
            'message': 'OTP sent to your email. Please verify to complete registration.',
            'email': data['email'],
        }, status=201)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'error': 'Email and OTP code are required'}, status=400)

        # Get latest unused OTP
        try:
            otp = OTP.objects.filter(
                email=email,
                code=code,
                is_used=False
            ).latest('created_at')
        except OTP.DoesNotExist:
            return Response({'error': 'Invalid OTP'}, status=400)

        if not otp.is_valid():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

        # Mark OTP as used
        otp.is_used = True
        otp.save()

        # Create user from temp_data
        import json
        if otp.temp_data:
            temp = json.loads(otp.temp_data)
            user = User.objects.create_user(
                username=temp['email'],
                email=temp['email'],
                password=temp['password'],
                first_name=temp.get('first_name', ''),
                university=temp.get('university', ''),
                is_active=True,
            )
            #set last login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
                
        elif otp.user:
            user = otp.user
            user.is_active = True
            user.save()
        else:
            return Response({'error': 'Registration data not found. Please register again.'}, status=400)

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Email verified successfully!',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })

class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')

        # Check if OTP exists for this email
        if not OTP.objects.filter(email=email, is_used=False).exists():
            return Response({'error': 'No pending verification found. Please register again.'}, status=404)

        # Invalidate old OTPs
        OTP.objects.filter(email=email, is_used=False).update(is_used=True)

        # Get temp data from old OTP
        old_otp = OTP.objects.filter(email=email).latest('created_at')
        temp_data = old_otp.temp_data

        # Generate new OTP
        otp_code = OTP.generate_otp()
        new_otp = OTP.objects.create(
            email=email,
            code=otp_code,
            temp_data=temp_data,
        )

        # Get name from temp data
        import json
        name = ''
        if temp_data:
            name = json.loads(temp_data).get('first_name', '')

        # Send email
        send_otp_email(email, otp_code, name)

        return Response({'message': 'New OTP sent to your email!'})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Update last_login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)


# ─── USER VIEWS ───────────────────────────────────────────────

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ─── MEAL VIEWS ───────────────────────────────────────────────

class MealListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        meals = Meal.objects.all()

        # Filters
        category = request.query_params.get('category')
        is_veg = request.query_params.get('is_vegetarian')
        search = request.query_params.get('search')
        sort = request.query_params.get('sort')

        if category:
            meals = meals.filter(category=category)
        if is_veg is not None:
            meals = meals.filter(is_vegetarian=is_veg == 'true')
        if search:
            meals = meals.filter(title__icontains=search)

        # Sorting (featured/pro meals first)
        if sort == 'rating':
            meals = meals.order_by('-is_featured', '-rating')
        elif sort == 'price':
            meals = meals.order_by('-is_featured', 'price_per_portion')
        elif sort == 'newest':
            meals = meals.order_by('-is_featured', '-created_at')
        else:
            meals = meals.order_by('-is_featured', '-created_at')

        serializer = MealSerializer(meals, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = MealSerializer(data=request.data)
        if serializer.is_valid():
            image_url = serializer.validated_data.get('image')
            if image_url:
                result = classify_food_image(image_url)
                if result['verdict'] != 'approved':
                    return Response({
                        'error': result['reason'],
                        'verdict': result['verdict'],
                        'confidence': result['confidence'],
                        'labels_detected': result['labels_detected'],
                    }, status=400)

            is_featured = False
            try:
                subscription = request.user.subscription
                is_featured = subscription.is_pro()
            except Exception:
                is_featured = False

            serializer.save(
                seller=request.user,
                available_portions=request.data.get('total_portions'),
                is_featured=is_featured,
            )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class MealListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        meals = Meal.objects.all()

        # Filters
        category = request.query_params.get('category')
        is_vegetarian = request.query_params.get('is_vegetarian')
        search = request.query_params.get('search')
        sort = request.query_params.get('sort', 'newest')

        if category:
            meals = meals.filter(category=category)
        if is_vegetarian:
            meals = meals.filter(is_vegetarian=True)
        if search:
            meals = meals.filter(
                models.Q(title__icontains=search) |
                models.Q(description__icontains=search)
            )

        # ── Sort: featured (pro sellers) always first ──
        if sort == 'rating':
            meals = meals.order_by('-is_featured', '-rating')
        elif sort == 'price':
            meals = meals.order_by('-is_featured', 'price_per_portion')
        else:  # newest (default)
            meals = meals.order_by('-is_featured', '-created_at')

        serializer = MealSerializer(meals, many=True, context={'request': request})
        return Response(serializer.data)


# ─── BOOKING VIEWS ────────────────────────────────────────────

class BookingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request):
        meal_id = request.data.get('meal_id')
        portions = int(request.data.get('portions', 1))

        try:
            meal = Meal.objects.get(pk=meal_id)
        except Meal.DoesNotExist:
            return Response({'error': 'Meal not found'}, status=404)

        if meal.seller == request.user:
            return Response(
                {'error': 'You cannot book your own meal'}, status=400
            )
        if meal.available_portions < portions:
            return Response(
                {'error': 'Not enough portions available'}, status=400
            )

        total_cost = meal.price_per_portion * portions
        booking = Booking.objects.create(
            meal=meal,
            user=request.user,
            portions=portions,
            total_cost=total_cost,
        )

        # Update meal portions
        meal.available_portions -= portions
        meal.bookings += portions
        meal.save()

        create_notification(
            request.user,
            'booking_updates',
            'Booking Confirmed',
            f"Your booking for {meal.title} is confirmed."
        )
        create_notification(
            meal.seller,
            'booking_updates',
            'New Booking',
            f"{request.user.first_name or request.user.email} booked {meal.title}."
        )

        return Response(BookingSerializer(booking).data, status=201)


class CancelBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.status == 'cancelled':
            return Response({'error': 'Already cancelled'}, status=400)

        booking.status = 'cancelled'
        booking.save()

        # Restore portions
        meal = booking.meal
        meal.available_portions += booking.portions
        meal.bookings -= booking.portions
        meal.save()

        create_notification(
            request.user,
            'booking_updates',
            'Booking Cancelled',
            f"Your booking for {meal.title} was cancelled."
        )
        create_notification(
            meal.seller,
            'booking_updates',
            'Booking Cancelled',
            f"A booking for {meal.title} was cancelled."
        )

        return Response(BookingSerializer(booking).data)

class BookingReceivedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(meal__seller=request.user).order_by('-booked_at')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class MyMealsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        meals = Meal.objects.filter(seller=request.user)
        serializer = MealSerializer(meals, many=True)

        # Calculate earnings
        my_bookings = Booking.objects.filter(
            meal__seller=request.user,
            status='confirmed'
        )
        total_earnings = sum(b.total_cost for b in my_bookings)

        return Response({
            'meals': serializer.data,
            'total_earnings': total_earnings
        })


class ReviewListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')

        if not booking_id or not rating:
            return Response({'error': 'Booking and rating are required'}, status=400)

        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return Response({'error': 'Rating must be a number'}, status=400)

        if rating < 1 or rating > 5:
            return Response({'error': 'Rating must be between 1 and 5'}, status=400)

        try:
            booking = Booking.objects.get(pk=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.status != 'confirmed':
            return Response({'error': 'Only confirmed bookings can be reviewed'}, status=400)

        if hasattr(booking, 'review'):
            return Response({'error': 'You already reviewed this booking'}, status=400)

        review = Review.objects.create(
            booking=booking,
            meal=booking.meal,
            reviewer=request.user,
            seller=booking.meal.seller,
            rating=rating,
            comment=comment,
        )

        meal_reviews = Review.objects.filter(meal=booking.meal)
        meal_avg = meal_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        booking.meal.rating = round(meal_avg, 1)
        booking.meal.reviews = meal_reviews.count()
        booking.meal.save(update_fields=['rating', 'reviews'])

        seller_reviews = Review.objects.filter(seller=booking.meal.seller)
        seller_avg = seller_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        booking.meal.seller.rating = round(seller_avg, 1)
        booking.meal.seller.save(update_fields=['rating'])

        create_notification(
            booking.meal.seller,
            'reviews',
            'New Review',
            f"You received a review for {booking.meal.title}."
        )

        return Response(ReviewSerializer(review).data, status=201)


class ReviewReceivedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = Review.objects.filter(seller=request.user).order_by('-created_at')
        return Response(ReviewSerializer(reviews, many=True).data)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        return Response(NotificationSerializer(notifications, many=True).data)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_id = request.data.get('notification_id')
        qs = Notification.objects.filter(user=request.user)
        if notification_id:
            qs = qs.filter(pk=notification_id)
        updated = qs.update(is_read=True)
        return Response({'updated': updated})
    

# ─── OTP VIEWS ───────────────────────────────────────────────
def generate_otp():
    return str(random.randint(100000, 999999))

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=400)

    # Block disposable/temporary email domains
    if is_disposable_email(email):
        return Response({
            'error': 'Disposable or temporary email addresses are not allowed. '
                     'Please use a real email address.'
        }, status=400)

    # Invalidate old OTPs
    OTP.objects.filter(email=email, is_used=False).update(is_used=True)

    # Create new OTP
    code = generate_otp()
    OTP.objects.create(email=email, code=code)

    # Send email
    send_mail(
        subject='Your Plato OTP Code',
        message=f'Your OTP code is: {code}\nIt expires in 10 minutes.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )

    return Response({'message': 'OTP sent successfully'}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    code = request.data.get('code')

    if not email or not code:
        return Response({'error': 'Email and code are required'}, status=400)

    try:
        otp = OTP.objects.filter(email=email, code=code, is_used=False).latest('created_at')
    except OTP.DoesNotExist:
        return Response({'error': 'Invalid OTP'}, status=400)

    if not otp.is_valid():
        return Response({'error': 'OTP has expired'}, status=400)

    otp.is_used = True
    otp.save()

    return Response({'message': 'OTP verified successfully'}, status=200)

class SubscriptionStatusView(APIView):
    """GET /api/subscription/ — get current user's subscription status"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription, created = Subscription.objects.get_or_create(
            user=request.user,
            defaults={'plan': 'free', 'is_active': False}
        )
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)


class SubscriptionUpgradeView(APIView):
    """POST /api/subscription/upgrade/ — submit upgrade request to pro"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_reference = request.data.get('payment_reference', '').strip()
        if not payment_reference:
            return Response({'error': 'Payment reference / Transaction ID is required.'}, status=400)

        subscription, created = Subscription.objects.get_or_create(
            user=request.user,
            defaults={'plan': 'free', 'is_active': False, 'status': 'none'}
        )

        if subscription.is_pro():
            return Response({
                'error': 'Already on Pro plan',
                'expires_at': subscription.expires_at,
                'days_remaining': subscription.days_remaining(),
            }, status=400)

        if subscription.status == 'pending':
            return Response({'error': 'You already have a pending upgrade request.'}, status=400)

        # Set request as pending, require admin approval
        subscription.plan = 'pro'
        subscription.status = 'pending'
        subscription.is_active = False
        subscription.started_at = None
        subscription.expires_at = None
        subscription.amount_paid = 199.00
        subscription.payment_reference = payment_reference
        subscription.save()

        serializer = SubscriptionSerializer(subscription)
        return Response({
            'message': 'Upgrade request submitted successfully! Waiting for admin approval.',
            'subscription': serializer.data,
        })


class SubscriptionCancelView(APIView):
    """POST /api/subscription/cancel/ — cancel pro subscription"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            subscription = Subscription.objects.get(user=request.user)
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found'}, status=404)

        if not subscription.is_pro():
            return Response({'error': 'No active Pro subscription'}, status=400)

        # Keep pro benefits until expiry; expiration job will downgrade later
        subscription.save()

        return Response({
            'message': 'Subscription cancelled. Pro benefits remain until expiry.',
            'expires_at': subscription.expires_at,
        })

#This is subscription renew view for testing purposes, not linked in frontend yet
class SubscriptionRenewView(APIView):
    """POST /api/subscription/renew/ — mock renew for another 30 days"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            subscription = Subscription.objects.get(user=request.user)
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found'}, status=404)

        now = timezone.now()

        # If still active, extend from current expiry
        # If expired, start fresh from now
        base = subscription.expires_at if (subscription.expires_at and subscription.expires_at > now) else now

        subscription.plan = 'pro'
        subscription.is_active = True
        subscription.started_at = now
        subscription.expires_at = base + timedelta(days=30)
        subscription.amount_paid = 199.00
        subscription.payment_reference = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
        subscription.save()

        # Re-feature meals
        Meal.objects.filter(seller=request.user).update(is_featured=True)

        serializer = SubscriptionSerializer(subscription)
        return Response({
            'message': 'Subscription renewed for 30 days!',
            'subscription': serializer.data,
        })


from django.http import HttpResponse
import requests
from api.payment_helpers import generate_esewa_signature, decode_esewa_callback_data
import time

class EsewaSubscriptionInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subscription, created = Subscription.objects.get_or_create(
            user=request.user,
            defaults={'plan': 'free', 'is_active': False, 'status': 'none'}
        )

        if subscription.is_pro():
            return Response({'error': 'Already on Pro plan'}, status=400)

        # Generate transaction UUID
        transaction_uuid = f"SUB-{subscription.id}-{int(time.time())}"
        subscription.payment_reference = transaction_uuid
        subscription.plan = 'pro'
        subscription.status = 'pending'
        subscription.save()

        # Generate checkout URL
        checkout_url = f"https://lather-moonlit-plasma.ngrok-free.dev/api/payment/esewa/checkout/?uuid={transaction_uuid}&type=subscription"

        return Response({
            'checkout_url': checkout_url,
            'transaction_uuid': transaction_uuid
        })

class EsewaBookingInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        meal_id = request.data.get('meal_id')
        portions = int(request.data.get('portions', 1))

        try:
            meal = Meal.objects.get(pk=meal_id)
        except Meal.DoesNotExist:
            return Response({'error': 'Meal not found'}, status=404)

        if meal.seller == request.user:
            return Response({'error': 'You cannot book your own meal'}, status=400)

        if meal.available_portions < portions:
            return Response({'error': 'Not enough portions available'}, status=400)

        total_cost = meal.price_per_portion * portions
        
        # Reserve portions
        meal.available_portions -= portions
        meal.bookings += portions
        meal.save()

        booking = Booking.objects.create(
            meal=meal,
            user=request.user,
            portions=portions,
            total_cost=total_cost,
            status='pending_payment',
            payment_method='esewa'
        )

        transaction_uuid = f"BKG-{booking.id}-{int(time.time())}"
        booking.payment_reference = transaction_uuid
        booking.save()

        # Generate checkout URL
        checkout_url = f"https://lather-moonlit-plasma.ngrok-free.dev/api/payment/esewa/checkout/?uuid={transaction_uuid}&type=booking"

        return Response({
            'checkout_url': checkout_url,
            'transaction_uuid': transaction_uuid
        })

class EsewaCheckoutView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uuid = request.query_params.get('uuid')
        p_type = request.query_params.get('type')

        if not uuid or not p_type:
            return HttpResponse("Missing parameters", status=400)

        amount = 0
        if p_type == 'subscription':
            try:
                sub = Subscription.objects.get(payment_reference=uuid)
                amount = 199  # Pro upgrade cost
            except Subscription.DoesNotExist:
                return HttpResponse("Subscription not found", status=404)
        elif p_type == 'booking':
            try:
                booking = Booking.objects.get(payment_reference=uuid)
                amount = int(booking.total_cost)
            except Booking.DoesNotExist:
                return HttpResponse("Booking not found", status=404)
        else:
            return HttpResponse("Invalid payment type", status=400)

        # Generate signature
        product_code = "EPAYTEST"
        msg = f"total_amount={amount},transaction_uuid={uuid},product_code={product_code}"
        signature = generate_esewa_signature(msg)

        success_url = f"https://lather-moonlit-plasma.ngrok-free.dev/api/payment/esewa/success/"
        failure_url = f"https://lather-moonlit-plasma.ngrok-free.dev/api/payment/esewa/failure/?uuid={uuid}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Plato eSewa Checkout</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin-top: 100px; background-color: #FAF9F6; color: #0F172A; }}
                .loader {{ border: 4px solid #f3f3f3; border-top: 4px solid #FF6B35; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; display: inline-block; margin-bottom: 20px; }}
                @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <h2>Connecting to eSewa...</h2>
            <p>Please wait while we securely redirect you to the payment gateway.</p>
            
            <form id="esewa-form" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
                <input type="hidden" name="amount" value="{amount}">
                <input type="hidden" name="tax_amount" value="0">
                <input type="hidden" name="total_amount" value="{amount}">
                <input type="hidden" name="transaction_uuid" value="{uuid}">
                <input type="hidden" name="product_code" value="{product_code}">
                <input type="hidden" name="product_service_charge" value="0">
                <input type="hidden" name="product_delivery_charge" value="0">
                <input type="hidden" name="success_url" value="{success_url}">
                <input type="hidden" name="failure_url" value="{failure_url}">
                <input type="hidden" name="signed_field_names" value="total_amount,transaction_uuid,product_code">
                <input type="hidden" name="signature" value="{signature}">
            </form>
            <script type="text/javascript">
                document.getElementById('esewa-form').submit();
            </script>
        </body>
        </html>
        """
        return HttpResponse(html_content)

class EsewaSuccessView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        encoded_data = request.query_params.get('data') or request.GET.get('data')
        if not encoded_data:
            return HttpResponse("No data received from eSewa", status=400)

        response_data = decode_esewa_callback_data(encoded_data)
        if not response_data:
            return HttpResponse("Failed to decode eSewa response", status=400)

        transaction_uuid = response_data.get('transaction_uuid')
        total_amount = response_data.get('total_amount')
        status_code = response_data.get('status')

        if status_code != 'COMPLETE':
            return HttpResponse(f"Payment status is not complete: {status_code}", status=400)

        # Call eSewa UAT verification API to confirm
        verification_url = f"https://rc.esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount={total_amount}&transaction_uuid={transaction_uuid}"
        try:
            v_res = requests.get(verification_url, timeout=10)
            v_data = v_res.json()
        except Exception as e:
            return HttpResponse(f"Verification request failed: {e}", status=500)

        if v_data.get('status') != 'COMPLETE':
            return HttpResponse("eSewa transaction verification failed", status=400)

        # Handle subscription or booking
        payment_title = ""
        payment_msg = ""
        if transaction_uuid.startswith('SUB-'):
            try:
                sub = Subscription.objects.get(payment_reference=transaction_uuid)
                now = timezone.now()
                sub.status = 'approved'
                sub.is_active = True
                sub.started_at = now
                sub.expires_at = now + timedelta(days=30)
                sub.amount_paid = float(total_amount)
                sub.save()
                
                # Feature user meals
                Meal.objects.filter(seller=sub.user).update(is_featured=True)
                
                payment_title = "Subscription Upgraded!"
                payment_msg = "Your account is now Pro. Enjoy featured listings and premium badges!"
            except Subscription.DoesNotExist:
                return HttpResponse("Subscription not found", status=404)
        elif transaction_uuid.startswith('BKG-'):
            try:
                booking = Booking.objects.get(payment_reference=transaction_uuid)
                booking.status = 'confirmed'
                booking.save()

                # Trigger notifications
                create_notification(
                    booking.user,
                    'booking_updates',
                    'Booking Confirmed',
                    f"Your booking for {booking.meal.title} is confirmed."
                )
                create_notification(
                    booking.meal.seller,
                    'booking_updates',
                    'New Booking',
                    f"{booking.user.first_name or booking.user.email} booked {booking.meal.title}."
                )

                payment_title = "Meal Booked Successfully!"
                payment_msg = f"Your booking for {booking.meal.title} has been confirmed. Enjoy your meal!"
            except Booking.DoesNotExist:
                return HttpResponse("Booking not found", status=404)
        else:
            return HttpResponse("Unknown transaction prefix", status=400)

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin-top: 80px; background-color: #FAF9F6; color: #0F172A; }}
                .card {{ background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.03); display: inline-block; max-width: 400px; margin: 15px; border: 1px solid #F0EFEA; }}
                .success-icon {{ font-size: 56px; color: #60bb46; margin-bottom: 24px; }}
                h2 {{ margin-bottom: 12px; font-weight: 800; }}
                p {{ color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }}
                .btn {{ background: #FF6B35; color: white; padding: 14px 28px; text-decoration: none; border-radius: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2); }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="success-icon">✓</div>
                <h2>{payment_title}</h2>
                <p>{payment_msg}</p>
                <p style="font-size: 13px; color: #94A3B8;">You can now close this browser and return to the Plato app. Your status will update automatically.</p>
                <a href="plato://profile" class="btn">Return to Plato</a>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content)

class EsewaFailureView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        transaction_uuid = request.query_params.get('uuid')
        
        # Handle cleanup if booking
        if transaction_uuid and transaction_uuid.startswith('BKG-'):
            try:
                booking = Booking.objects.get(payment_reference=transaction_uuid)
                if booking.status == 'pending_payment':
                    # Release portions
                    meal = booking.meal
                    meal.available_portions += booking.portions
                    meal.bookings = max(0, meal.bookings - booking.portions)
                    meal.save()
                    
                    booking.status = 'cancelled'
                    booking.save()
            except Booking.DoesNotExist:
                pass
        elif transaction_uuid and transaction_uuid.startswith('SUB-'):
            try:
                sub = Subscription.objects.get(payment_reference=transaction_uuid)
                if sub.status == 'pending':
                    sub.status = 'none'
                    sub.plan = 'free'
                    sub.save()
            except Subscription.DoesNotExist:
                pass

        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin-top: 80px; background-color: #FAF9F6; color: #0F172A; }
                .card { background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.03); display: inline-block; max-width: 400px; margin: 15px; border: 1px solid #F0EFEA; }
                .fail-icon { font-size: 56px; color: #EF4444; margin-bottom: 24px; }
                h2 { margin-bottom: 12px; font-weight: 800; }
                p { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
                .btn { background: #64748B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 14px; font-weight: 700; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="fail-icon">✕</div>
                <h2>Payment Cancelled</h2>
                <p>The transaction was cancelled or could not be completed. You have not been charged.</p>
                <p style="font-size: 13px; color: #94A3B8;">Please return to the Plato app to retry or select another payment method.</p>
                <a href="plato://profile" class="btn">Return to Plato</a>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content)

    

