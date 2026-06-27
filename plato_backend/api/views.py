from datetime import timedelta
import os

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Avg
import uuid

BACKEND_URL = os.getenv("BACKEND_URL", "https://lather-moonlit-plasma.ngrok-free.dev")

from api import models
from .models import Subscription, User, Meal, Booking, OTP, Review, Notification, Wallet, WalletTransaction, PushToken, PlatformWallet, PlatformTransaction
from .ai_views import classify_food_image
from .serializers import (
    RegisterSerializer, SubscriptionSerializer, UserSerializer,
    MealSerializer, BookingSerializer, ReviewSerializer, NotificationSerializer,
    WalletSerializer
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
# ─── HELPERS ──────────────────────────────────────────────────

from zoneinfo import ZoneInfo
from datetime import datetime as _dt

_NEPAL_TZ = ZoneInfo('Asia/Kathmandu')

def _pickup_passed(meal):
    """Return True if meal's pickup time on meal_date is already past (Nepal time)."""
    now_np = timezone.now().astimezone(_NEPAL_TZ)
    today_np = now_np.date()
    if meal.meal_date > today_np:
        return False
    if meal.meal_date < today_np:
        return True
    try:
        pt = _dt.strptime(meal.pickup_time.strip(), '%I:%M %p')
        return (now_np.hour, now_np.minute) >= (pt.hour, pt.minute)
    except Exception:
        return False

def filter_active_meals(qs):
    """Remove meals whose pickup datetime has already passed."""
    return [m for m in qs if not _pickup_passed(m)]

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


def send_push_notification(user, title, body, category=''):
    """Send a real push notification to all devices registered for this user."""
    tokens = list(PushToken.objects.filter(user=user).values_list('token', flat=True))
    if not tokens:
        print(f'[Push] No tokens for user {user.pk}')
        return
    messages = [
        {
            'to': token,
            'title': title,
            'body': body,
            'sound': 'default',
            'priority': 'high',
            'channelId': 'default',
            'data': {'title': title, 'body': body, 'category': category},
        }
        for token in tokens
    ]
    try:
        import httpx as _httpx
        resp = _httpx.post(
            'https://exp.host/--/api/v2/push/send',
            json=messages,
            headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
            timeout=10,
        )
        print(f'[Push] Sent to {len(tokens)} token(s), status={resp.status_code}')
    except Exception as e:
        print(f'[Push] Failed to send: {e}')


def notify_new_meal(meal):
    """Push 'new meal available' to all users at the same university as the cook."""
    if not meal or not meal.seller:
        return
    university = meal.seller.university
    if not university:
        return
    cook_name = meal.seller.first_name or meal.seller.email.split('@')[0]
    title = f'New Meal at {university}!'
    message = (
        f'{cook_name} just listed {meal.title} — '
        f'Rs.{int(meal.price_per_portion)}/portion · {meal.pickup_location}'
    )
    # Notify users from same university excluding the cook
    users = User.objects.filter(
        university__iexact=university,
        is_active=True,
        notify_new_meals=True,
    ).exclude(pk=meal.seller.pk)
    for user in users:
        create_notification(user, 'new_meals', title, message)


def create_notification(user, category, title, message):
    if not should_notify(user, category):
        return None
    notif = Notification.objects.create(
        user=user,
        category=category,
        title=title,
        message=message,
    )
    # Also send a real push notification to the device
    send_push_notification(user, title, message, category=category)
    return notif


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


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required'}, status=400)

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Don't reveal whether the email exists
            return Response({'message': 'If that email is registered, an OTP has been sent.'})

        # Invalidate old password-reset OTPs
        OTP.objects.filter(email=email, is_used=False).update(is_used=True)

        otp_code = OTP.generate_otp()
        OTP.objects.create(email=email, code=otp_code)

        from .email_service import send_otp_email
        result = send_otp_email(email, otp_code, user.first_name, subject='Reset your Plato password')
        if not result.get('success'):
            return Response({'error': 'Failed to send OTP. Please try again.'}, status=500)

        return Response({'message': 'OTP sent to your email. Enter it to reset your password.'})


class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()

        if not email or not code:
            return Response({'error': 'Email and OTP are required'}, status=400)

        try:
            otp = OTP.objects.filter(email=email, code=code, is_used=False).latest('created_at')
        except OTP.DoesNotExist:
            return Response({'error': 'Invalid OTP. Please check and try again.'}, status=400)

        if not otp.is_valid():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

        return Response({'valid': True, 'message': 'OTP verified. Set your new password.'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()
        new_password = request.data.get('new_password', '')

        if not email or not code or not new_password:
            return Response({'error': 'Email, OTP, and new password are required'}, status=400)
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters'}, status=400)

        try:
            otp = OTP.objects.filter(email=email, code=code, is_used=False).latest('created_at')
        except OTP.DoesNotExist:
            return Response({'error': 'Invalid or expired OTP'}, status=400)

        if not otp.is_valid():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        otp.is_used = True
        otp.save()

        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password reset successfully. You can now log in.'})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response({'error': 'Current and new password are required'}, status=400)
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters'}, status=400)
        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=400)
        if current_password == new_password:
            return Response({'error': 'New password must be different from current password'}, status=400)

        request.user.set_password(new_password)
        request.user.save()

        return Response({'message': 'Password changed successfully.'})


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

class RegisterPushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'token is required'}, status=400)
        PushToken.objects.get_or_create(user=request.user, token=token)
        return Response({'message': 'Push token registered.'})

    def delete(self, request):
        token = request.data.get('token', '').strip()
        PushToken.objects.filter(user=request.user, token=token).delete()
        return Response({'message': 'Push token removed.'})


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
        today = timezone.now().date()
        meals = Meal.objects.filter(seller__isnull=False, seller__is_active=True, meal_date__gte=today, status='approved')

        # Apply DB filters first (while still a QuerySet)
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

        if sort == 'rating':
            meals = meals.order_by('-is_featured', '-rating')
        elif sort == 'price':
            meals = meals.order_by('-is_featured', 'price_per_portion')
        else:
            meals = meals.order_by('-is_featured', '-created_at')

        # Now filter by pickup time (converts to list)
        meals = filter_active_meals(meals)

        serializer = MealSerializer(meals, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = MealSerializer(data=request.data)
        if serializer.is_valid():
            image_url = serializer.validated_data.get('image')
            status = 'approved'
            if image_url:
                result = classify_food_image(image_url)
                if result['verdict'] == 'rejected':
                    return Response({
                        'error': result['reason'],
                        'verdict': result['verdict'],
                        'confidence': result['confidence'],
                        'labels_detected': result['labels_detected'],
                    }, status=400)
                elif result['verdict'] == 'pending_review':
                    status = 'pending_review'

            is_featured = False

            serializer.save(
                seller=request.user,
                available_portions=request.data.get('total_portions'),
                is_featured=is_featured,
                status=status,
            )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class MealListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        today = timezone.now().date()
        meals = Meal.objects.filter(seller__isnull=False, seller__is_active=True, meal_date__gte=today, status='approved')

        # Apply DB filters first (while still a QuerySet)
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

        if sort == 'rating':
            meals = meals.order_by('-is_featured', '-rating')
        elif sort == 'price':
            meals = meals.order_by('-is_featured', 'price_per_portion')
        else:
            meals = meals.order_by('-is_featured', '-created_at')

        # Now filter by pickup time (converts to list)
        meals = filter_active_meals(meals)

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
        if meal.meal_date < timezone.now().date():
            return Response(
                {'error': 'This meal has expired and can no longer be booked'}, status=400
            )
        if meal.available_portions < portions:
            return Response(
                {'error': 'Not enough portions available'}, status=400
            )

        total_cost = meal.price_per_portion * portions
        payment_method = request.data.get('payment_method', 'cash')
        is_wallet = payment_method == 'wallet'

        booking = Booking.objects.create(
            meal=meal,
            user=request.user,
            portions=portions,
            total_cost=total_cost,
            status='pending_payment' if is_wallet else 'confirmed',
            payment_method=payment_method,
        )

        # Update meal portions
        meal.available_portions -= portions
        meal.bookings += portions
        meal.save()

        # Only notify if booking is immediately confirmed (cash)
        if not is_wallet:
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
        refund_amount = round(booking.total_cost * 0.7, 2)

        meal = booking.meal
        meal_title = meal.title if meal else 'meal'
        cancellation_fee = round(booking.total_cost * 0.3, 2)

        if booking.payment_method == 'wallet':
            # Money was held (never reached seller) — split it now:
            # Buyer gets 70% back, seller gets 30% cancellation fee

            # 70% → buyer
            buyer_wallet, _ = Wallet.objects.get_or_create(user=request.user)
            buyer_wallet.balance = round(buyer_wallet.balance + refund_amount, 2)
            buyer_wallet.save()
            WalletTransaction.objects.create(
                wallet=buyer_wallet, type='credit', amount=refund_amount,
                reason='refund',
                description=f'Refund for cancelled booking — {meal_title}',
                reference=str(booking.id),
            )

            # 30% → seller as cancellation fee (less 5% platform commission)
            if meal:
                cancellation_commission = round(cancellation_fee * 0.05, 2)
                net_cancellation_fee = round(cancellation_fee - cancellation_commission, 2)
                seller_wallet, _ = Wallet.objects.get_or_create(user=meal.seller)
                seller_wallet.balance = round(seller_wallet.balance + net_cancellation_fee, 2)
                seller_wallet.save()
                WalletTransaction.objects.create(
                    wallet=seller_wallet, type='credit', amount=net_cancellation_fee,
                    reason='booking_payment',
                    description=f'Cancellation fee for {meal_title} (after 5% platform commission of Rs.{cancellation_commission}) — buyer cancelled',
                    reference=str(booking.id),
                )
                # Credit commission into platform wallet
                platform_wallet = PlatformWallet.get()
                platform_wallet.balance = round(platform_wallet.balance + cancellation_commission, 2)
                platform_wallet.total_earned = round(platform_wallet.total_earned + cancellation_commission, 2)
                platform_wallet.save()
                PlatformTransaction.objects.create(
                    wallet=platform_wallet,
                    amount=cancellation_commission,
                    reason='cancellation_commission',
                    description=f'5% commission on cancellation fee — {meal_title} (buyer cancelled)',
                    booking_id=str(booking.id),
                )
            booking.refund_status = 'completed'
        elif booking.payment_method == 'esewa':
            booking.refund_status = 'pending'
        else:
            booking.refund_status = 'none'
        booking.save()

        # Restore portions
        if meal:
            meal.available_portions += booking.portions
            meal.bookings -= booking.portions
            meal.save()

        create_notification(
            request.user, 'booking_updates', 'Booking Cancelled',
            f'Your booking for {meal_title} was cancelled. '
            + (f'Rs.{int(refund_amount)} refunded to your wallet.' if booking.payment_method == 'wallet' else '')
        )
        if meal:
            cancellation_commission = round(cancellation_fee * 0.05, 2)
            net_cancellation_fee = round(cancellation_fee - cancellation_commission, 2)
            create_notification(
                meal.seller, 'booking_updates', 'Booking Cancelled',
                f'A booking for {meal_title} was cancelled. '
                + (f'You keep Rs.{int(net_cancellation_fee)} cancellation fee (after 5% platform commission).' if booking.payment_method == 'wallet' else '')
            )
            # Credit commission into platform wallet (seller cancellation, buyer keeps full)
            if booking.payment_method == 'wallet':
                platform_wallet = PlatformWallet.get()
                platform_wallet.balance = round(platform_wallet.balance + cancellation_commission, 2)
                platform_wallet.total_earned = round(platform_wallet.total_earned + cancellation_commission, 2)
                platform_wallet.save()
                PlatformTransaction.objects.create(
                    wallet=platform_wallet,
                    amount=cancellation_commission,
                    reason='cancellation_commission',
                    description=f'5% commission on cancellation fee — {meal_title} (seller cancelled)',
                    booking_id=str(booking.id),
                )

        return Response(BookingSerializer(booking).data)


class MarkBookingReceivedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.status != 'confirmed':
            return Response({'error': 'Only confirmed bookings can be marked as received'}, status=400)
        if not booking.is_handed_over:
            return Response({'error': 'The cook has not handed over the food yet'}, status=400)

        booking.status = 'received'
        booking.save(update_fields=['status'])

        meal = booking.meal
        if meal:
            # Release held payment to seller's wallet (less 5% commission)
            commission = round(booking.total_cost * 0.05, 2)
            net_amount = round(booking.total_cost - commission, 2)
            seller_wallet, _ = Wallet.objects.get_or_create(user=meal.seller)
            seller_wallet.balance = round(seller_wallet.balance + net_amount, 2)
            seller_wallet.save()
            WalletTransaction.objects.create(
                wallet=seller_wallet,
                type='credit',
                amount=net_amount,
                reason='booking_payment',
                description=f'Payment released (after 5% platform commission of Rs.{commission}) — {meal.title} confirmed received',
                reference=str(booking.id),
            )
            # Credit commission into platform wallet
            platform_wallet = PlatformWallet.get()
            platform_wallet.balance = round(platform_wallet.balance + commission, 2)
            platform_wallet.total_earned = round(platform_wallet.total_earned + commission, 2)
            platform_wallet.save()
            PlatformTransaction.objects.create(
                wallet=platform_wallet,
                amount=commission,
                reason='booking_commission',
                description=f'5% commission on booking — {meal.title} (Rs.{booking.total_cost} total)',
                booking_id=str(booking.id),
            )
            create_notification(
                meal.seller,
                'booking_updates',
                'Payment Released',
                f'Rs.{int(net_amount)} added to your wallet (after 5% platform commission) — {request.user.first_name or request.user.email} confirmed they received {meal.title}.'
            )
            create_notification(
                request.user,
                'booking_updates',
                'Thank you!',
                f'Enjoy your {meal.title}! The cook has been paid.'
            )

        return Response(BookingSerializer(booking).data)


class HandOverBookingView(APIView):
    """Cook taps 'Handed Over' — notifies buyer to confirm receipt."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, meal__seller=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.status != 'confirmed':
            return Response({'error': 'Only confirmed bookings can be marked as handed over'}, status=400)

        if booking.is_handed_over:
            return Response({'error': 'Already marked as handed over'}, status=400)

        # Set the flag — this unlocks the buyer's "Mark as Received" button
        booking.is_handed_over = True
        booking.save(update_fields=['is_handed_over'])

        meal = booking.meal
        cook_name = request.user.first_name or request.user.email

        # Notify buyer to confirm receipt so payment is released
        create_notification(
            booking.user,
            'booking_updates',
            'Food Ready — Confirm Receipt!',
            f'{cook_name} has handed over your {meal.title if meal else "meal"}. '
            f'Please tap "Mark as Received" in your Orders to release payment to the cook.'
        )

        return Response({'message': 'Buyer has been notified to confirm receipt.'})


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

        # Calculate earnings (after 5% platform commission)
        my_bookings = Booking.objects.filter(
            meal__seller=request.user,
            status='confirmed'
        )
        total_earnings = round(sum(b.total_cost * 0.95 for b in my_bookings), 2)

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

        if booking.status not in ('confirmed', 'received'):
            return Response({'error': 'Only confirmed or received bookings can be reviewed'}, status=400)

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
        return Response({
            'plan': 'free',
            'status': 'none',
            'is_active': False,
            'is_pro': False,
            'days_remaining': 0,
            'payment_reference': '',
            'amount_paid': 0.0
        })


class SubscriptionUpgradeView(APIView):
    """POST /api/subscription/upgrade/ — submit upgrade request to pro"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'error': 'Premium subscriptions are no longer available.'}, status=400)


class SubscriptionCancelView(APIView):
    """POST /api/subscription/cancel/ — cancel pro subscription"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'error': 'Premium subscriptions are no longer available.'}, status=400)

#This is subscription renew view for testing purposes, not linked in frontend yet
class SubscriptionRenewView(APIView):
    """POST /api/subscription/renew/ — mock renew for another 30 days"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'error': 'Premium subscriptions are no longer available.'}, status=400)


from django.http import HttpResponse
import requests
from api.payment_helpers import generate_esewa_signature, decode_esewa_callback_data
import time

class EsewaSubscriptionInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'error': 'Premium subscriptions are no longer available.'}, status=400)


class EsewaSubscriptionRenewView(APIView):
    """POST /api/subscription/esewa/renew/ — initiate eSewa payment for Pro renewal"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'error': 'Premium subscriptions are no longer available.'}, status=400)

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

        if meal.meal_date < timezone.now().date():
            return Response({'error': 'This meal has expired and can no longer be booked'}, status=400)

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
        checkout_url = f"{BACKEND_URL}/api/payment/esewa/checkout/?uuid={transaction_uuid}&type=booking"

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
                amount = 199
            except Subscription.DoesNotExist:
                return HttpResponse("Subscription not found", status=404)
        elif p_type == 'booking':
            try:
                booking = Booking.objects.get(payment_reference=uuid)
                amount = int(booking.total_cost)
            except Booking.DoesNotExist:
                return HttpResponse("Booking not found", status=404)
        elif p_type == 'wallet':
            try:
                amount = int(request.query_params.get('amount', 0))
                if amount < 50:
                    return HttpResponse("Invalid amount", status=400)
            except (TypeError, ValueError):
                return HttpResponse("Invalid amount", status=400)
        else:
            return HttpResponse("Invalid payment type", status=400)

        # Generate signature
        product_code = "EPAYTEST"
        msg = f"total_amount={amount},transaction_uuid={uuid},product_code={product_code}"
        signature = generate_esewa_signature(msg)

        success_url = f"{BACKEND_URL}/api/payment/esewa/success/"
        failure_url = f"{BACKEND_URL}/api/payment/esewa/failure/?uuid={uuid}"

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
        if transaction_uuid.startswith('RNW-'):
            # Renewal: extend existing Pro subscription
            try:
                sub = Subscription.objects.get(payment_reference=transaction_uuid)
                now = timezone.now()
                # Stack from current expiry if still active, else from now
                base = sub.expires_at if (sub.expires_at and sub.expires_at > now) else now
                sub.status = 'approved'
                sub.is_active = True
                sub.started_at = now
                sub.expires_at = base + timedelta(days=30)
                sub.amount_paid = float(total_amount)
                sub.save()

                Meal.objects.filter(seller=sub.user).update(is_featured=True)

                payment_title = "Pro Renewed!"
                payment_msg = f"Your Pro subscription has been extended by 30 days!"
            except Subscription.DoesNotExist:
                return HttpResponse("Subscription not found", status=404)
        elif transaction_uuid.startswith('SUB-'):
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
        elif transaction_uuid.startswith('WLT-'):
            try:
                parts = transaction_uuid.split('-')
                user_id = int(parts[1])
                user = User.objects.get(pk=user_id)
            except (User.DoesNotExist, IndexError, ValueError):
                return HttpResponse("User not found", status=404)
            amount_credited = float(total_amount)
            wallet, _ = Wallet.objects.get_or_create(user=user)
            wallet.balance = round(wallet.balance + amount_credited, 2)
            wallet.save()
            WalletTransaction.objects.create(
                wallet=wallet, type='credit', amount=amount_credited,
                reason='topup', description='Wallet top-up via eSewa',
                reference=transaction_uuid,
            )
            create_notification(user, 'booking_updates', 'Wallet Topped Up',
                                f'Rs.{int(amount_credited)} added to your Plato Wallet.')
            payment_title = "Wallet Topped Up!"
            payment_msg = f"Rs.{int(amount_credited)} has been added to your Plato Wallet."
        else:
            return HttpResponse("Unknown transaction prefix", status=400)

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ box-sizing: border-box; margin: 0; padding: 0; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #FFF8F5 0%, #FAF9F6 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }}
                .card {{ background: white; padding: 40px 30px; border-radius: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); max-width: 380px; width: 100%; text-align: center; border: 1px solid #F0EFEA; }}
                .icon {{ font-size: 64px; margin-bottom: 20px; }}
                h2 {{ font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 10px; }}
                .subtitle {{ color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px; }}
                .hint {{ color: #94A3B8; font-size: 13px; line-height: 1.5; margin-bottom: 28px; }}
                .btn-primary {{ background: linear-gradient(135deg, #FF6B35, #FF8C42); color: white; padding: 15px 32px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 15px; display: block; box-shadow: 0 6px 20px rgba(255,107,53,0.3); margin-bottom: 10px; width: 100%; text-align: center; }}
                .btn-secondary {{ background: #F1F5F9; color: #475569; padding: 12px 32px; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 14px; display: block; margin-bottom: 12px; width: 100%; text-align: center; }}
                .countdown {{ color: #94A3B8; font-size: 13px; margin-top: 16px; }}
                #timer {{ font-weight: 700; color: #FF6B35; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✅</div>
                <h2>{payment_title}</h2>
                <p class="subtitle">{payment_msg}</p>
                <p class="hint">Open the Plato app to see your update.</p>
                <a href="plato://mymeals" class="btn-primary" id="returnBtnApp">↩ Open Plato App</a>
                <a href="exp+plato://mymeals" class="btn-secondary" id="returnBtnExpo">↩ Open in Expo Go</a>
                <div class="countdown" id="countdownEl">Auto-redirecting in <span id="timer">3</span>s...</div>
            </div>
            <script>
                var returnPath = '{"wallet" if transaction_uuid.startswith("WLT-") else "profile" if transaction_uuid.startswith(("SUB-","RNW-")) else "mymeals"}';
                var isAndroid = /Android/i.test(navigator.userAgent);

                // APK intent — tries production app first, falls back to Expo Go
                var apkIntent = 'intent://' + returnPath + '#Intent;scheme=plato;package=com.platofood.plato;S.browser_fallback_url=intent%3A%2F%2F' + returnPath + '%23Intent%3Bscheme%3Dexp%2Bplato%3Bpackage%3Dhost.exp.exponent%3Bend;end';
                // Expo Go intent — targets Expo Go only
                var expoIntent = 'intent://' + returnPath + '#Intent;scheme=exp+plato;package=host.exp.exponent;end';

                var appBtn = document.getElementById('returnBtnApp');
                var expoBtn = document.getElementById('returnBtnExpo');

                if (isAndroid) {{
                    appBtn.href = apkIntent;
                    expoBtn.href = expoIntent;
                    var count = 3;
                    var t = setInterval(function() {{
                        count--;
                        var el = document.getElementById('timer');
                        if (el) el.textContent = count;
                        if (count <= 0) {{
                            clearInterval(t);
                            window.location.href = apkIntent;
                        }}
                    }}, 1000);
                }} else {{
                    appBtn.href = 'plato://' + returnPath;
                    expoBtn.href = 'exp+plato://' + returnPath;
                    var cd = document.getElementById('countdownEl');
                    if (cd) cd.style.display = 'none';
                }}
            </script>
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
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #FFF8F5 0%, #FAF9F6 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .card { background: white; padding: 40px 30px; border-radius: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); max-width: 380px; width: 100%; text-align: center; border: 1px solid #F0EFEA; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h2 { font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 10px; }
                .subtitle { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px; }
                .hint { color: #94A3B8; font-size: 13px; line-height: 1.5; margin-bottom: 28px; }
                .btn-primary { background: #64748B; color: white; padding: 15px 32px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 15px; display: block; width: 100%; margin-bottom: 10px; text-align: center; }
                .btn-secondary { background: #F1F5F9; color: #475569; padding: 12px 32px; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 14px; display: block; margin-bottom: 12px; text-align: center; }
                .countdown { color: #94A3B8; font-size: 13px; margin-top: 16px; }
                #timer { font-weight: 700; color: #64748B; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">❌</div>
                <h2>Payment Cancelled</h2>
                <p class="subtitle">The transaction was cancelled or could not be completed.</p>
                <p class="hint">You have not been charged. Tap below to return to Plato and try again.</p>
                <a href="plato://mymeals" class="btn-primary" id="returnBtnApp">↩ Open Plato App</a>
                <a href="exp+plato://mymeals" class="btn-secondary" id="returnBtnExpo">↩ Open in Expo Go</a>
                <div class="countdown" id="countdownEl">Auto-redirecting in <span id="timer">3</span>s...</div>
            </div>
            <script>
                var isAndroid = /Android/i.test(navigator.userAgent);
                var apkIntent = 'intent://mymeals#Intent;scheme=plato;package=com.platofood.plato;S.browser_fallback_url=intent%3A%2F%2Fmymeals%23Intent%3Bscheme%3Dexp%2Bplato%3Bpackage%3Dhost.exp.exponent%3Bend;end';
                var expoIntent = 'intent://mymeals#Intent;scheme=exp+plato;package=host.exp.exponent;end';

                if (isAndroid) {
                    document.getElementById('returnBtnApp').href = apkIntent;
                    document.getElementById('returnBtnExpo').href = expoIntent;
                    var count = 3;
                    var t = setInterval(function() {
                        count--;
                        var el = document.getElementById('timer');
                        if (el) el.textContent = count;
                        if (count <= 0) {
                            clearInterval(t);
                            window.location.href = apkIntent;
                        }
                    }, 1000);
                } else {
                    document.getElementById('returnBtnApp').href = 'plato://mymeals';
                    document.getElementById('returnBtnExpo').href = 'exp+plato://mymeals';
                    var cd = document.getElementById('countdownEl');
                    if (cd) cd.style.display = 'none';
                }
            </script>
        </body>
        </html>
        """
        return HttpResponse(html_content)

    



# ─── WALLET VIEWS ─────────────────────────────────────────────────────────

class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        txns = wallet.transactions.order_by('-created_at')[:30]
        from .serializers import WalletTransactionSerializer
        return Response({
            'balance': wallet.balance,
            'transactions': WalletTransactionSerializer(txns, many=True).data,
        })


class WalletTopupInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        try:
            amount = float(amount)
            if amount < 50:
                return Response({'error': 'Minimum top-up is Rs.50'}, status=400)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid amount'}, status=400)

        transaction_uuid = f"WLT-{request.user.id}-{uuid.uuid4().hex[:8].upper()}"
        # Route through eSewa checkout (same as subscription/booking)
        checkout_url = f"{BACKEND_URL}/api/payment/esewa/checkout/?uuid={transaction_uuid}&type=wallet&amount={int(amount)}"

        return Response({'checkoutUrl': checkout_url})


class WalletTopupSuccessView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        transaction_uuid = request.query_params.get('uuid', '')
        amount = request.query_params.get('amount', 0)

        if not transaction_uuid.startswith('WLT-'):
            return HttpResponse('Invalid request', status=400)

        try:
            parts = transaction_uuid.split('-')
            user_id = int(parts[1])
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, IndexError, ValueError):
            return HttpResponse('User not found', status=404)

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return HttpResponse('Invalid amount', status=400)

        # Credit the wallet
        wallet, _ = Wallet.objects.get_or_create(user=user)
        wallet.balance = round(wallet.balance + amount, 2)
        wallet.save()

        WalletTransaction.objects.create(
            wallet=wallet,
            type='credit',
            amount=amount,
            reason='topup',
            description=f'Wallet top-up via eSewa',
            reference=transaction_uuid,
        )

        create_notification(user, 'booking_updates', 'Wallet Topped Up',
                            f'Rs.{int(amount)} added to your Plato Wallet.')

        html = f"""<!DOCTYPE html><html>
        <head><title>Top-up Successful</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>*{{box-sizing:border-box;margin:0;padding:0}}body{{font-family:-apple-system,sans-serif;background:#FFF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}}.card{{background:#fff;padding:40px 30px;border-radius:28px;box-shadow:0 20px 60px rgba(0,0,0,.08);max-width:380px;width:100%;text-align:center}}.icon{{font-size:64px;margin-bottom:20px}}h2{{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:10px}}.sub{{color:#475569;font-size:15px;margin-bottom:24px}}.amt{{font-size:32px;font-weight:800;color:#FF6B35;margin-bottom:24px}}.btn{{background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;padding:15px 32px;text-decoration:none;border-radius:16px;font-weight:700;font-size:15px;display:inline-block;width:100%}}</style></head>
        <body><div class="card"><div class="icon">💰</div><h2>Wallet Topped Up!</h2><p class="sub">Successfully added</p><div class="amt">Rs.{int(amount)}</div>
        <a href="plato://wallet" class="btn" id="btnApp">↩ Open Plato App</a>
        <a href="exp+plato://wallet" style="display:block;margin-top:8px;color:#94A3B8;font-size:13px;text-decoration:none;text-align:center;" id="btnExpo">Open in Expo Go</a></div>
        <script>
        var isAndroid=/Android/i.test(navigator.userAgent);
        var apkLink=isAndroid?'intent://wallet#Intent;scheme=plato;package=com.platofood.plato;S.browser_fallback_url=intent%3A%2F%2Fwallet%23Intent%3Bscheme%3Dexp%2Bplato%3Bpackage%3Dhost.exp.exponent%3Bend;end':'plato://wallet';
        var expoLink=isAndroid?'intent://wallet#Intent;scheme=exp+plato;package=host.exp.exponent;end':'exp+plato://wallet';
        document.getElementById('btnApp').href=apkLink;
        document.getElementById('btnExpo').href=expoLink;
        var c=3,t=setInterval(function(){{c--;if(c<=0){{clearInterval(t);window.location.href=apkLink;}}}},1000);
        </script>
        </body></html>"""
        return HttpResponse(html)


class WalletPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        try:
            booking = Booking.objects.get(pk=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.status != 'pending_payment':
            return Response({'error': 'Booking is not awaiting payment'}, status=400)
        if booking.payment_method != 'wallet':
            return Response({'error': 'This booking is not set up for wallet payment'}, status=400)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        if wallet.balance < booking.total_cost:
            return Response({
                'error': f'Insufficient wallet balance. You have Rs.{wallet.balance}, need Rs.{booking.total_cost}.'
            }, status=400)

        meal_title = booking.meal.title if booking.meal else 'meal'
        seller = booking.meal.seller if booking.meal else None

        # Deduct from buyer wallet
        wallet.balance = round(wallet.balance - booking.total_cost, 2)
        wallet.save()
        WalletTransaction.objects.create(
            wallet=wallet, type='debit', amount=booking.total_cost,
            reason='booking_payment',
            description=f'Payment for {meal_title}',
            reference=str(booking.id),
        )

        # Payment is HELD — seller gets paid only when buyer marks as received
        booking.status = 'confirmed'
        booking.payment_method = 'wallet'
        booking.save()

        if booking.meal:
            create_notification(
                request.user, 'booking_updates', 'Booking Confirmed',
                f'Your booking for {meal_title} is confirmed. Pickup at {booking.meal.pickup_location}. '
                f'Payment is held and released to the cook when you mark it as received.'
            )
            if seller:
                create_notification(
                    seller, 'booking_updates', 'New Booking',
                    f'{request.user.first_name or request.user.email} booked {meal_title}. '
                    f'Rs.{int(booking.total_cost)} will be released to your wallet once they confirm receipt.'
                )

        return Response({'message': 'Payment successful', 'booking': BookingSerializer(booking).data})


class WalletSubscriptionPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'error': 'Premium subscriptions are no longer available.'}, status=400)
