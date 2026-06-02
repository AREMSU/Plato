from django.urls import path
from . import ai_views

urlpatterns = [
    path('recommended/', ai_views.RecommendedMealsView.as_view(), name='recommended-meals'),
    path('filter-image/', ai_views.ImageFilterView.as_view(), name='filter-image'),
    path('verify-image/', ai_views.VerifyImageView.as_view(), name='verify-image'),
    path('qa/review/', ai_views.QAReviewView.as_view(), name='qa-review'),
    path('qa/review/<int:pk>/', ai_views.QAReviewView.as_view(), name='qa-review-detail'),
]