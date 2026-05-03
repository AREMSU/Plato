from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify-otp/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/resend-otp/', views.ResendOTPView.as_view(), name='resend-otp'),
    # User
    path('users/me/', views.UserProfileView.as_view(), name='profile'),

    # Meals
    path('meals/', views.MealListCreateView.as_view(), name='meals'),
    path('meals/<int:pk>/', views.MealDetailView.as_view(), name='meal-detail'),
    path('meals/my/', views.MyMealsView.as_view(), name='my-meals'),

    # Bookings
    path('bookings/', views.BookingListCreateView.as_view(), name='bookings'),
    path('bookings/<int:pk>/cancel/', views.CancelBookingView.as_view(), name='cancel-booking'),
]