import io
import httpx
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
from django.utils import timezone
from .models import Meal
from .serializers import MealSerializer

# ── Local GPU food classifier ──────────────────────────────────────────
# Model: nateraw/food (binary food / non_food classifier)
# Runs on RTX 4050 via CUDA 12.4 — ~50ms per image after warm-up
# Model (~100 MB) downloads once to ~/.cache/huggingface on first start
# ──────────────────────────────────────────────────────────────────────

_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        import torch
        from transformers import pipeline as hf_pipeline

        device = 0 if torch.cuda.is_available() else -1
        device_label = torch.cuda.get_device_name(0) if device == 0 else 'CPU'
        print(f'[FoodAI] Loading nateraw/food on {device_label}...')

        _pipeline = hf_pipeline(
            'image-classification',
            model='nateraw/food',
            device=device,
        )
        print(f'[FoodAI] Ready on {device_label}')
        return _pipeline
    except ImportError:
        print('[FoodAI] torch / transformers not installed.')
        return None
    except Exception as e:
        print(f'[FoodAI] Model load error: {e}')
        return None


def classify_food_bytes(image_bytes):
    if not image_bytes or len(image_bytes) < 5000:
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'Please add a clear photo of the meal.',
            'labels_detected': [],
        }

    clf = _get_pipeline()
    if clf is None:
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'Image sent for admin review.',
            'labels_detected': [],
        }

    try:
        from PIL import Image as PILImage
        image = PILImage.open(io.BytesIO(image_bytes)).convert('RGB')
        # Return top-5 results for better label info
        results = clf(image, top_k=5)

        # nateraw/food is a Food-101 classifier (101 food categories).
        # Real food images → high top score; non-food images → all scores very low.
        top = results[0]
        confidence = round(top['score'], 4)
        top_label = top['label'].replace('_', ' ').title()
        labels = [r['label'].replace('_', ' ') for r in results]

        if confidence < 0.3:
            return {
                'verdict': 'rejected',
                'confidence': confidence,
                'reason': 'This image does not appear to contain food. Please upload a clear photo of your meal.',
                'labels_detected': labels,
            }
        elif confidence < 0.55:
            return {
                'verdict': 'pending_review',
                'confidence': confidence,
                'reason': f'Possible food detected ({top_label}) but confidence is low — an admin will verify.',
                'labels_detected': labels,
            }
        else:
            return {
                'verdict': 'approved',
                'confidence': confidence,
                'reason': f'Verified as food: {top_label}.',
                'labels_detected': labels,
            }
    except Exception as e:
        print(f'[FoodAI] Inference error: {e}')
        return {
            'verdict': 'pending_review',
            'confidence': 0.0,
            'reason': 'Image sent for admin review.',
            'labels_detected': [],
        }


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

    return classify_food_bytes(img_response.content)


class RecommendedMealsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        from .views import filter_active_meals
        meals = Meal.objects.filter(
            available_portions__gt=0,
            status='approved',
            seller__isnull=False,
            seller__is_active=True,
            meal_date__gte=today
        )
        meals = filter_active_meals(meals)

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

    COOKWARE_LABELS = {
        'wok', 'plate', 'bowl', 'frying pan', 'frypan', 'skillet',
        'pan', 'pot', 'spatula', 'ladle', 'tongs', 'kitchen utensil',
        'cookware', 'dutch oven', 'saucepan', 'stockpot',
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

            if meal.status == 'approved':
                from .views import notify_new_meal
                notify_new_meal(meal)

            return Response({
                'verdict': result['verdict'],
                'confidence': result['confidence'],
                'reason': result['reason'],
                'meal_id': meal_id,
                'labels_detected': result['labels_detected']
            })

        except Exception as e:
            return Response({'error': str(e)}, status=500)


class VerifyImageView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'image required'}, status=400)

        try:
            image_bytes = image.read()
            result = classify_food_bytes(image_bytes)
            return Response(result)
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
        if new_status == 'approved':
            from .views import notify_new_meal
            notify_new_meal(meal)
        return Response(MealSerializer(meal).data)
