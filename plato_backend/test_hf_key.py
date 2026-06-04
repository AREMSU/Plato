import os
import requests

api_key = "YOUR_HF_TOKEN_HERE"
headers = {"Authorization": f"Bearer {api_key}"}
API_URL = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"

# Download a sample image
img_data = requests.get("https://upload.wikimedia.org/wikipedia/commons/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg").content

response = requests.post(API_URL, headers=headers, data=img_data)
print(response.status_code)
print(response.json())
