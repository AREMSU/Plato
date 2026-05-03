import resend
from django.conf import settings

resend.api_key = settings.RESEND_API_KEY

def send_otp_email(email, otp_code, name):
    try:
        response = resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "Plato - Your Verification Code",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ Plato</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Student Meal Sharing Platform</p>
                </div>
                <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
                    <h2 style="color: #1A1A1A;">Hi {name}! 👋</h2>
                    <p style="color: #757575; font-size: 16px;">Your verification code is:</p>
                    <div style="background: #FFF3EE; border: 2px dashed #FF6B35; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #FF6B35; font-size: 48px; margin: 0; letter-spacing: 10px;">{otp_code}</h1>
                    </div>
                    <p style="color: #757575;">This code expires in <strong>5 minutes</strong>.</p>
                    <p style="color: #757575;">If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #BDBDBD; font-size: 12px; text-align: center;">© 2026 Plato - Student Meal Sharing</p>
                </div>
            </div>
            """
        })
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False