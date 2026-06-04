import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plato.settings')
django.setup()

from api.ai_views import classify_food_bytes
import httpx

img_url = 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg'
res = httpx.get(img_url)
print("Result:")
print(classify_food_bytes(res.content))
