import os
import httpx
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from .models import Meal
from .serializers import MealSerializer


def classify_food_image(image_url):
    if not image_url:
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'Please add a clear photo of the meal.',
            'labels_detected': [],
        }

    img_response = httpx.get(
        image_url,
        follow_redirects=True,
        headers={'User-Agent': 'Mozilla/5.0'},
        timeout=15
    )

    if len(img_response.content) < 1000:
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'We could not read this photo. Please try another image.',
            'labels_detected': [],
        }

    api_key = os.getenv('HUGGINGFACE_API_KEY')
    if not api_key:
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'We could not verify your photo right now. Please try again in a minute.',
            'labels_detected': [],
        }

    hf_response = httpx.post(
        'https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'image/jpeg'
        },
        content=img_response.content,
        timeout=30
    )

    if not hf_response.text.strip():
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'We could not verify your photo right now. Please try again in a minute.',
            'labels_detected': [],
        }

    results = hf_response.json()
    if isinstance(results, dict) and 'error' in results:
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'We could not verify your photo right now. Please try again in a minute.',
            'labels_detected': [],
        }

    food_score = 0.0
    top_labels = []

    for item in results[:5]:
        label = item.get('label', '').lower()
        score = item.get('score', 0)
        top_labels.append(item.get('label'))
        for food_word in ImageFilterView.FOOD_LABELS:
            if food_word in label:
                food_score = max(food_score, score)
                break

    if food_score >= 0.40:
        verdict = 'approved'
        reason = 'Image confirmed as food'
    elif food_score < 0.10:
        verdict = 'rejected'
        reason = 'This does not look like food. Please upload a real meal image.'
    else:
        verdict = 'pending_review'
        reason = 'We could not verify this photo as food. Please use a clearer food image.'

    return {
        'verdict': verdict,
        'confidence': round(food_score, 2),
        'reason': reason,
        'labels_detected': top_labels,
    }


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
            featured_bonus = 0.75 if meal.is_featured else 0
            return (
                0.4 * velocity +
                0.3 * (rating / 5) +
                0.2 * availability +
                0.1 * recency +
                featured_bonus
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


class ImageFilterView(APIView):
    permission_classes = [IsAuthenticated]

    FOOD_LABELS = {
        'food', 'dish', 'meal', 'cuisine', 'ingredient', 'recipe',
        'breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink',
        'beverage', 'fruit', 'vegetable', 'meat', 'rice', 'bread',
        'soup', 'salad', 'pizza', 'burger', 'pasta', 'noodle',
        'dumpling', 'curry', 'stew', 'sandwich', 'cake', 'cookie',
        'street food', 'fast food', 'comfort food', 'produce',
        'staple food', 'whole food', 'junk food', 'natural foods',
        'hot pot', 'hotpot', 'wok', 'plate', 'bowl', 'frying pan',
    }

    def post(self, request):
        image_url = request.data.get('image_url')
        meal_id = request.data.get('meal_id')

        if not image_url or not meal_id:
            return Response({'error': 'image_url and meal_id required'}, status=400)

        try:
            meal = Meal.objects.get(pk=meal_id, seller=request.user)
        except Meal.DoesNotExist:
            return Response({'error': 'Meal not found'}, status=404)

        try:
            result = classify_food_image(image_url)

            if result['verdict'] == 'approved':
                meal.status = 'approved'
            elif result['verdict'] == 'rejected':
                meal.status = 'rejected'
            else:
                meal.status = 'pending_review'

            meal.save()

            return Response({
                'verdict': result['verdict'],
                'confidence': result['confidence'],
                'reason': result['reason'],
                'meal_id': meal_id,
                'labels_detected': result['labels_detected']
            })

        except Exception as e:
            return Response({'error': str(e)}, status=500)


class QAReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending = Meal.objects.filter(status='pending_review')
        return Response(MealSerializer(pending, many=True).data)

    def patch(self, request, pk):
        try:
            meal = Meal.objects.get(pk=pk)
        except Meal.DoesNotExist:
            return Response({'error': 'Meal not found'}, status=404)

        new_status = request.data.get('status')
        if new_status not in ['approved', 'rejected']:
            return Response({'error': 'Status must be approved or rejected'}, status=400)

        meal.status = new_status
        meal.save()
        return Response(MealSerializer(meal).data)
