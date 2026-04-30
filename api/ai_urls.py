from django.urls import path
from . import ai_views

urlpatterns = [
    path('recommended/', ai_views.RecommendedMealsView.as_view(), name='recommended-meals'),
]