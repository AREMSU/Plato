from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import Meal
from .serializers import MealSerializer


class RecommendedMealsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        meals = Meal.objects.filter(
            available_portions__gt=0,
            status='approved'
        )

        def score(meal):
            days_alive = max((now - meal.created_at).days, 1)
            velocity = meal.bookings / days_alive
            rating = meal.rating or 0
            availability = meal.available_portions / max(meal.total_portions, 1)
            recency = 1 / days_alive
            return (
                0.4 * velocity +
                0.3 * (rating / 5) +
                0.2 * availability +
                0.1 * recency
            )

        scored = sorted(meals, key=score, reverse=True)

        categories = {}
        for meal in scored:
            cat = meal.category
            if cat not in categories:
                categories[cat] = []
            if len(categories[cat]) < 5:
                categories[cat].append(MealSerializer(meal).data)

        return Response(categories)