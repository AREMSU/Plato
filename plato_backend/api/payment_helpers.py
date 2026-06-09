import hmac
import hashlib
import base64
import os

_ESEWA_SECRET_KEY = os.getenv("ESEWA_SECRET_KEY", "8gBm/:&EnhH.1/q")

def generate_esewa_signature(message: str, secret_key: str = None) -> str:
    """
    Generates eSewa signature using HMAC-SHA256.
    Message format: 'total_amount=100,transaction_uuid=123,product_code=EPAYTEST'
    """
    key = (secret_key or _ESEWA_SECRET_KEY).encode('utf-8')
    h = hmac.new(key, message.encode('utf-8'), hashlib.sha256)
    return base64.b64encode(h.digest()).decode('utf-8')

def decode_esewa_callback_data(base64_data: str) -> dict:
    """Decodes the base64-encoded JSON response data from eSewa redirect."""
    try:
        import json
        decoded_bytes = base64.b64decode(base64_data)
        return json.loads(decoded_bytes.decode('utf-8'))
    except Exception as e:
        print(f"Error decoding eSewa callback data: {e}")
        return {}
