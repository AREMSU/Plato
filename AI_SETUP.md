# Plato AI Module — Setup Guide

## What was added
- `api/ai_views.py` — AI logic (recommendation + image filter)
- `api/ai_urls.py` — AI routes
- `api/migrations/0002_meal_status.py` — new status field on Meal model

## Step 1 — Pull the branch
```bash
git fetch --all
git checkout aremsu-dev
git pull origin aremsu-dev
```

## Step 2 — Install dependencies
```bash
pip install -r requirements.txt
```

## Step 3 — Create .env file in ~/Plato/

## Step 4 — Fix settings.py
In `plato/settings.py` change:
```python
load_dotenv()
```
to:
```python
load_dotenv(Path(__file__).resolve().parent.parent / '.env')
```

## Step 5 — Run migrations
```bash
cd ~/Plato
python manage.py migrate
```

## Step 6 — Run server
```bash
python manage.py runserver
```

## Step 7 — Test AI endpoints

### Login and set token
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['tokens']['access'])")

echo "Token set: ${TOKEN:0:20}..."
```

### Test recommendation (no token needed)
```bash
curl -s http://localhost:8000/api/ai/recommended/ | python -m json.tool
```

### Test image filter — food image
```bash
# Download test images first
curl -L -o /tmp/food.jpg "https://images.immediate.co.uk/production/volatile/sites/30/2020/08/chorizo-mozarella-gnocchi-bake-cropped-9ab73a3.jpg"
curl -L -o /tmp/notfood.jpg "https://www.gstatic.com/webp/gallery/1.jpg"

# Start image server in a separate terminal
cd /tmp && python -m http.server 8080

# Run filter
curl -s -X POST http://localhost:8000/api/ai/filter-image/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"image_url": "http://localhost:8080/food.jpg", "meal_id": 1}'
```

### Test image filter — non-food image
```bash
curl -s -X POST http://localhost:8000/api/ai/filter-image/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"image_url": "http://localhost:8080/notfood.jpg", "meal_id": 1}'
```

### View QA review queue
```bash
curl -s http://localhost:8000/api/ai/qa/review/ \
  -H "Authorization: Bearer $TOKEN"
```

### Approve or reject a meal
```bash
# Approve
curl -s -X PATCH http://localhost:8000/api/ai/qa/review/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "approved"}'

# Reject
curl -s -X PATCH http://localhost:8000/api/ai/qa/review/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "rejected"}'
```

## AI Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/ai/recommended/ | No | Trending meals by category |
| POST | /api/ai/filter-image/ | Yes | Run image through ViT classifier |
| GET | /api/ai/qa/review/ | Yes | List pending review meals |
| PATCH | /api/ai/qa/review/<id>/ | Yes | Approve or reject a meal |

## Confidence Threshold System

| Score | Verdict | Action |
|-------|---------|--------|
| >= 0.40 | approved | Listing goes live instantly |
| 0.10 - 0.40 | pending_review | Sent to QA queue |
| < 0.10 | rejected | Seller asked to re-upload |

## Model Info
- **Model:** google/vit-base-patch16-224
- **Provider:** HuggingFace Inference API
- **Type:** Vision Transformer (ViT)
- **Cost:** Free tier
