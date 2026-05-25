import smtplib
from django.core.mail import send_mail
from django.conf import settings

def send_otp_email(email, otp_code, first_name=''):
    try:
        send_mail(
            subject='Your Plato OTP Code',
            message=f'Hi {first_name},\n\nYour OTP is: {otp_code}\n\nValid for 10 minutes.',
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