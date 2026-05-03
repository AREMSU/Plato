from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Meal, Booking, OTP
from .serializers import (
    RegisterSerializer, UserSerializer,
    MealSerializer, BookingSerializer
)
from rest_framework.decorators import api_view, permission_classes
from django.core.mail import send_mail
from django.utils import timezone
import random
from .models import OTP
from django.conf import settings
from .email_service import send_otp_email
# ─── AUTH VIEWS ───────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            return Response({'error': 'Email already exists'}, status=400)

        # Create inactive user
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            university=data.get('university', ''),
            is_active=False,  # ← inactive until OTP verified
        )

        # Generate and save OTP
        otp_code = OTP.generate_otp()
        OTP.objects.create(
            user=user,
            email=user.email,
            code=otp_code,
        )

        # Send OTP email
        send_otp_email(user.email, otp_code, user.first_name)

        return Response({
            'message': 'OTP sent to your email. Please verify to complete registration.',
            'email': user.email,
        }, status=201)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'error': 'Email and OTP code are required'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        # Get latest OTP
        try:
            otp = OTP.objects.filter(
                user=user,
                code=code,
                is_used=False
            ).latest('created_at')
        except OTP.DoesNotExist:
            return Response({'error': 'Invalid OTP'}, status=400)

        if not otp.is_valid():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

        # Activate user
        user.is_active = True
        user.save()

        # Mark OTP as used
        otp.is_used = True
        otp.save()

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

        try:
            user = User.objects.get(email=email, is_active=False)
        except User.DoesNotExist:
            return Response({'error': 'User not found or already verified'}, status=404)

        # Invalidate old OTPs
        OTP.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate new OTP
        otp_code = OTP.generate_otp()
        OTP.objects.create(
            user=user,
            email=user.email,
            code=otp_code,
        )

        # Send email
        send_otp_email(user.email, otp_code, user.first_name)

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

        # Sorting
        if sort == 'rating':
            meals = meals.order_by('-rating')
        elif sort == 'price':
            meals = meals.order_by('price_per_portion')
        elif sort == 'newest':
            meals = meals.order_by('-created_at')
        else:
            meals = meals.order_by('-created_at')

        serializer = MealSerializer(meals, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = MealSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                seller=request.user,
                available_portions=request.data.get('total_portions')
            )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class MealDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        try:
            meal = Meal.objects.get(pk=pk)
            return Response(MealSerializer(meal).data)
        except Meal.DoesNotExist:
            return Response({'error': 'Meal not found'}, status=404)

    def delete(self, request, pk):
        try:
            meal = Meal.objects.get(pk=pk)
            if meal.seller != request.user:
                return Response({'error': 'Not authorized'}, status=403)
            meal.delete()
            return Response({'message': 'Meal deleted'})
        except Meal.DoesNotExist:
            return Response({'error': 'Meal not found'}, status=404)


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

        return Response(BookingSerializer(booking).data)


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
    

# ─── OTP VIEWS ───────────────────────────────────────────────
def generate_otp():
    return str(random.randint(100000, 999999))

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=400)

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