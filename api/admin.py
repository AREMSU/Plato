from django.contrib import admin
from .models import User, Meal, Booking

admin.site.register(User)
admin.site.register(Meal)
admin.site.register(Booking)