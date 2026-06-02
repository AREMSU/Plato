import hmac
import hashlib
import base64

def generate_esewa_signature(message: str, secret_key: str = "8gBm/:&EnhH.1/q") -> str:
    """
    Generates eSewa signature using HMAC-SHA256.
    Message format example: 'total_amount=100,transaction_uuid=123,product_code=EPAYTEST'
    """
    h = hmac.new(secret_key.encode('utf-8'), message.encode('utf-8'), hashlib.sha256)
    digest = h.digest()
    return base64.b64encode(digest).decode('utf-8')

def decode_esewa_callback_data(base64_data: str) -> dict:
    """
    Decodes the base64-encoded JSON response data from eSewa redirect.
    """
    try:
        decoded_bytes = base64.b64decode(base64_data)
        decoded_str = decoded_bytes.decode('utf-8')
        import json
        return json.loads(decoded_str)
    except Exception as e:
        print(f"Error decoding eSewa callback data: {e}")
        return {}
