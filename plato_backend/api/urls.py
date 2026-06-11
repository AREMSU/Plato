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
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/verify-reset-otp/', views.VerifyResetOTPView.as_view(), name='verify-reset-otp'),
    path('auth/reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # User
    path('users/me/', views.UserProfileView.as_view(), name='profile'),

    # Meals — my/ MUST be before <int:pk>/
    path('meals/', views.MealListCreateView.as_view(), name='meals'),
    path('meals/my/', views.MyMealsView.as_view(), name='my-meals'),
    path('meals/<int:pk>/', views.MealListCreateView.as_view(), name='meal-detail'),

    # Bookings
    path('bookings/', views.BookingListCreateView.as_view(), name='bookings'),
    path('bookings/received/', views.BookingReceivedView.as_view(), name='bookings-received'),
    path('bookings/<int:pk>/cancel/', views.CancelBookingView.as_view(), name='cancel-booking'),
    path('bookings/<int:pk>/received/', views.MarkBookingReceivedView.as_view(), name='booking-received'),

    # Reviews
    path('reviews/', views.ReviewListCreateView.as_view(), name='reviews'),
    path('reviews/received/', views.ReviewReceivedView.as_view(), name='reviews-received'),

    # Notifications
    path('notifications/', views.NotificationListView.as_view(), name='notifications'),
    path('notifications/read/', views.NotificationReadView.as_view(), name='notifications-read'),

    # Subscription
    path('subscription/', views.SubscriptionStatusView.as_view()),
    path('subscription/upgrade/', views.SubscriptionUpgradeView.as_view()),
    path('subscription/cancel/', views.SubscriptionCancelView.as_view()),
    path('subscription/renew/', views.SubscriptionRenewView.as_view()),

    # eSewa UAT Payment Gateway Integration
    path('subscription/wallet/pay/', views.WalletSubscriptionPayView.as_view()),
    path('payment/esewa/checkout/', views.EsewaCheckoutView.as_view()),
    path('payment/esewa/success/', views.EsewaSuccessView.as_view()),
    path('payment/esewa/failure/', views.EsewaFailureView.as_view()),

    # Wallet
    path('wallet/', views.WalletView.as_view()),
    path('wallet/topup/initiate/', views.WalletTopupInitiateView.as_view()),
    path('wallet/topup/success/', views.WalletTopupSuccessView.as_view()),
    path('wallet/pay/', views.WalletPayView.as_view()),
]