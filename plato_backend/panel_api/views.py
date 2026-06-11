from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from api.models import User, Meal, Booking, OTP, Subscription
from api.serializers import UserSerializer, MealSerializer, BookingSerializer


class AdminLoginView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if user and user.is_staff:
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)}
            })
        return Response({'error': 'Invalid credentials or not staff'}, status=401)


class DashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        thirty = now - timezone.timedelta(days=30)
        seven = now - timezone.timedelta(days=7)
        rev = Booking.objects.filter(status='confirmed').aggregate(t=Sum('total_cost'))['t'] or 0
        mrev = Booking.objects.filter(status='confirmed', booked_at__gte=thirty).aggregate(t=Sum('total_cost'))['t'] or 0
        cats = list(Meal.objects.values('category').annotate(count=Count('id')).order_by('-count'))
        avg = Meal.objects.aggregate(a=Avg('price_per_portion'))['a'] or 0
        return Response({
            'total_users': User.objects.count(), 'total_meals': Meal.objects.count(),
            'total_bookings': Booking.objects.count(),
            'active_bookings': Booking.objects.filter(status='confirmed').count(),
            'cancelled_bookings': Booking.objects.filter(status='cancelled').count(),
            'total_revenue': round(rev, 2), 'monthly_revenue': round(mrev, 2),
            'new_users_week': User.objects.filter(date_joined__gte=seven).count(),
            'new_meals_week': Meal.objects.filter(created_at__gte=seven).count(),
            'categories': cats,
            'pro_users': Subscription.objects.filter(plan='pro', is_active=True).count(),
            'total_portions_sold': Booking.objects.filter(status='confirmed').aggregate(t=Sum('portions'))['t'] or 0,
            'avg_price': round(avg, 2),
            'recent_bookings': BookingSerializer(Booking.objects.select_related('user', 'meal').order_by('-booked_at')[:8], many=True).data,
            'recent_users': UserSerializer(User.objects.order_by('-date_joined')[:5], many=True).data,
            'recent_meals': MealSerializer(Meal.objects.select_related('seller').order_by('-created_at')[:5], many=True).data,
            'pending_meals': MealSerializer(Meal.objects.filter(status='pending_review').select_related('seller').order_by('-created_at')[:10], many=True).data,
        })


class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        q = request.query_params.get('q', '').strip()
        f = request.query_params.get('filter', 'all')
        users = User.objects.all().order_by('-date_joined')
        if q: users = users.filter(Q(email__icontains=q)|Q(first_name__icontains=q)|Q(university__icontains=q))
        if f == 'active': users = users.filter(is_active=True)
        elif f == 'inactive': users = users.filter(is_active=False)
        elif f == 'staff': users = users.filter(is_staff=True)
        data = [{'id':u.id,'email':u.email,'first_name':u.first_name,'last_name':u.last_name,
                 'university':u.university or '','rating':u.rating,'meals_shared':u.meals_shared,
                 'is_active':u.is_active,'is_staff':u.is_staff,'is_superuser':u.is_superuser,
                 'date_joined':u.date_joined,'avatar':u.avatar or ''} for u in users[:100]]
        return Response({'users': data, 'total': users.count()})


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, user_id):
        try: u = User.objects.get(pk=user_id)
        except User.DoesNotExist: return Response({'error':'Not found'}, status=404)
        earnings = Booking.objects.filter(meal__seller=u, status='confirmed').aggregate(t=Sum('total_cost'))['t'] or 0
        try:
            sub = u.subscription
            subscription = {'plan':sub.plan,'is_active':sub.is_active,'is_pro':sub.is_pro(),'days_remaining':sub.days_remaining(),'expires_at':sub.expires_at}
        except Subscription.DoesNotExist: subscription = None
        return Response({
            'user':{'id':u.id,'email':u.email,'first_name':u.first_name,'last_name':u.last_name,
                    'university':u.university,'bio':u.bio,'avatar':u.avatar,'rating':u.rating,
                    'meals_shared':u.meals_shared,'is_active':u.is_active,'is_staff':u.is_staff,
                    'is_superuser':u.is_superuser,'date_joined':u.date_joined,'last_login':u.last_login},
            'meals': MealSerializer(Meal.objects.filter(seller=u).order_by('-created_at'), many=True).data,
            'bookings': BookingSerializer(Booking.objects.filter(user=u).select_related('meal').order_by('-booked_at'), many=True).data,
            'earnings': round(earnings, 2), 'subscription': subscription,
        })


class AdminUserActionView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, user_id):
        action = request.data.get('action')
        try: u = User.objects.get(pk=user_id)
        except User.DoesNotExist: return Response({'error':'Not found'}, status=404)
        if u == request.user: return Response({'error':'Cannot modify yourself'}, status=400)
        if action == 'toggle_active':
            u.is_active = not u.is_active; u.save(update_fields=['is_active'])
            return Response({'message':'Done','is_active':u.is_active})
        elif action == 'toggle_staff':
            u.is_staff = not u.is_staff; u.save(update_fields=['is_staff'])
            return Response({'message':'Done','is_staff':u.is_staff})
        elif action == 'delete':
            u.delete(); return Response({'message':'Deleted'})
        return Response({'error':'Invalid action'}, status=400)


class AdminMealsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        q = request.query_params.get('q','').strip()
        cat = request.query_params.get('category','')
        f = request.query_params.get('filter','all')
        meals = Meal.objects.select_related('seller').order_by('-created_at')
        if q: meals = meals.filter(Q(title__icontains=q)|Q(seller__email__icontains=q))
        if cat: meals = meals.filter(category=cat)
        if f == 'available': meals = meals.filter(available_portions__gt=0)
        elif f == 'sold_out': meals = meals.filter(available_portions=0)
        elif f == 'featured': meals = meals.filter(is_featured=True)
        elif f == 'vegetarian': meals = meals.filter(is_vegetarian=True)
        elif f == 'pending_review': meals = meals.filter(status='pending_review')
        return Response({'meals':MealSerializer(meals[:100], many=True).data,'total':meals.count()})


class AdminMealDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, meal_id):
        try: meal = Meal.objects.select_related('seller').get(pk=meal_id)
        except Meal.DoesNotExist: return Response({'error':'Not found'}, status=404)
        rev = Booking.objects.filter(meal=meal, status='confirmed').aggregate(t=Sum('total_cost'))['t'] or 0
        return Response({
            'meal':MealSerializer(meal).data,
            'bookings':BookingSerializer(Booking.objects.filter(meal=meal).select_related('user').order_by('-booked_at'), many=True).data,
            'revenue':round(rev, 2),
        })


class AdminMealActionView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, meal_id):
        action = request.data.get('action')
        try: meal = Meal.objects.get(pk=meal_id)
        except Meal.DoesNotExist: return Response({'error':'Not found'}, status=404)
        if action == 'delete': meal.delete(); return Response({'message':'Deleted'})
        elif action == 'toggle_featured':
            meal.is_featured = not meal.is_featured; meal.save(update_fields=['is_featured'])
            return Response({'message':'Done','is_featured':meal.is_featured})
        elif action == 'approve':
            meal.status = 'approved'
            meal.save(update_fields=['status'])
            from api.views import notify_new_meal
            notify_new_meal(meal)
            return Response({'message':'Meal approved successfully','status':meal.status})
        elif action == 'reject':
            meal.status = 'rejected'
            meal.save(update_fields=['status'])
            return Response({'message':'Meal rejected successfully','status':meal.status})
        return Response({'error':'Invalid action'}, status=400)


class AdminBookingsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        s = request.query_params.get('status','')
        q = request.query_params.get('q','').strip()
        bk = Booking.objects.select_related('user','meal','meal__seller').order_by('-booked_at')
        if s: bk = bk.filter(status=s)
        if q: bk = bk.filter(Q(user__email__icontains=q)|Q(meal__title__icontains=q))
        return Response({'bookings':BookingSerializer(bk[:100], many=True).data,'total':bk.count()})


class AdminBookingCancelView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, booking_id):
        try: b = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist: return Response({'error':'Not found'}, status=404)
        if b.status == 'cancelled': return Response({'error':'Already cancelled'}, status=400)
        b.status = 'cancelled'
        b.refund_status = 'pending' if b.payment_method == 'esewa' else 'none'
        b.save(update_fields=['status', 'refund_status'])
        m = b.meal; m.available_portions += b.portions; m.bookings -= b.portions; m.save()
        return Response({'message':'Cancelled'})


class AdminRefundCompleteView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, booking_id):
        try: b = Booking.objects.get(pk=booking_id, status='cancelled')
        except Booking.DoesNotExist: return Response({'error':'Not found'}, status=404)
        if b.refund_status != 'pending': return Response({'error':'No pending refund'}, status=400)
        b.refund_status = 'completed'
        b.save(update_fields=['refund_status'])
        return Response({'message':'Refund marked as completed'})


class AdminSubscriptionsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        f = request.query_params.get('filter','all')
        subs = Subscription.objects.select_related('user').order_by('-created_at')
        if f == 'pro': subs = subs.filter(plan='pro', is_active=True)
        elif f == 'free': subs = subs.filter(plan='free')
        elif f == 'expired': subs = subs.filter(is_active=False)
        elif f == 'pending': subs = subs.filter(status='pending')
        data = [{'id':s.id,'user_email':s.user.email,'user_id':s.user.id,'plan':s.plan,
                 'is_active':s.is_active,'is_pro':s.is_pro(),'days_remaining':s.days_remaining(),
                 'amount_paid':s.amount_paid,'payment_reference':s.payment_reference,
                 'started_at':s.started_at,'expires_at':s.expires_at, 'status': s.status} for s in subs[:100]]
        return Response({'subscriptions':data,'total':subs.count()})


class AdminSubscriptionActionView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, subscription_id):
        action = request.data.get('action')
        try: sub = Subscription.objects.get(pk=subscription_id)
        except Subscription.DoesNotExist: return Response({'error': 'Not found'}, status=404)

        if action == 'approve':
            now = timezone.now()
            sub.status = 'approved'
            # If currently active Pro, extend from current expiry date (stacking)
            base = sub.expires_at if (sub.plan == 'pro' and sub.is_active and sub.expires_at and sub.expires_at > now) else now
            sub.plan = 'pro'
            sub.is_active = True
            sub.started_at = now
            sub.expires_at = base + timezone.timedelta(days=30)
            sub.save()
            # Feature all existing meals by this user
            Meal.objects.filter(seller=sub.user).update(is_featured=True)
            return Response({'message': 'Approved successfully'})
        elif action == 'reject':
            sub.status = 'rejected'
            # Only set inactive if they are not currently an active Pro user
            if not sub.is_pro():
                sub.is_active = False
            sub.save()
            return Response({'message': 'Rejected successfully'})
        return Response({'error': 'Invalid action'}, status=400)


class AdminOTPsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        data = [{'id':o.id,'email':o.email,'code':o.code,'is_used':o.is_used,
                 'is_valid':o.is_valid(),'created_at':o.created_at} for o in OTP.objects.order_by('-created_at')[:100]]
        return Response({'otps':data})
