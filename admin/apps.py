from django.apps import AppConfig


class AdminConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'admin'
    label = 'admin_dashboard'  # Avoid conflict with django.contrib.admin
    verbose_name = 'Plato Admin Panel'
