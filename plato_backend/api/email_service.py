import smtplib
from django.core.mail import send_mail
from django.conf import settings

def send_otp_email(email, otp_code, first_name='', subject=None):
    email_subject = subject or 'Your Plato OTP Code'
    try:
        send_mail(
            subject=email_subject,
            message=f'Hi {first_name or "there"},\n\nYour OTP code is: {otp_code}\n\nValid for 10 minutes. Do not share this with anyone.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=False,  # ← CRITICAL — must be False
        )
        return {'success': True}

    except smtplib.SMTPRecipientsRefused:
        # Gmail rejected the address — mailbox doesn't exist
        return {'success': False, 'reason': 'email_not_found'}

    except smtplib.SMTPException as e:
        return {'success': False, 'reason': 'smtp_error'}

    except Exception as e:
        return {'success': False, 'reason': 'unknown'}