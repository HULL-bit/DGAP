from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["canal", "destinataire", "statut", "cree_le"]
    list_filter = ["canal", "statut"]
    search_fields = ["destinataire", "sujet"]
    readonly_fields = ["canal", "destinataire", "sujet", "contenu", "statut", "cree_le"]
