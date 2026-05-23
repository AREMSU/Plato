from django.urls import path
from . import views

app_name = 'admin_dashboard'

urlpatterns = [
    path('api/login/', views.AdminLoginView.as_view(), name='admin_login'),
    path('api/dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('api/users/', views.AdminUsersView.as_view(), name='users'),
    path('api/users/<int:user_id>/', views.AdminUserDetailView.as_view(), name='user_detail'),
    path('api/users/<int:user_id>/action/', views.AdminUserActionView.as_view(), name='user_action'),
    path('api/meals/', views.AdminMealsView.as_view(), name='meals'),
    path('api/meals/<int:meal_id>/', views.AdminMealDetailView.as_view(), name='meal_detail'),
    path('api/meals/<int:meal_id>/action/', views.AdminMealActionView.as_view(), name='meal_action'),
    path('api/bookings/', views.AdminBookingsView.as_view(), name='bookings'),
    path('api/bookings/<int:booking_id>/cancel/', views.AdminBookingCancelView.as_view(), name='booking_cancel'),
    path('api/subscriptions/', views.AdminSubscriptionsView.as_view(), name='subscriptions'),
    path('api/otps/', views.AdminOTPsView.as_view(), name='otps'),
]
