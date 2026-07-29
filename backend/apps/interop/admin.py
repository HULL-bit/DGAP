from django.contrib import admin

from .models import EchangeExterne


@admin.register(EchangeExterne)
class EchangeExterneAdmin(admin.ModelAdmin):
    list_display = ["systeme", "direction", "type_echange", "statut", "acteur", "cree_le"]
    list_filter = ["systeme", "direction", "statut"]
    search_fields = ["type_echange", "empreinte_charge"]
    readonly_fields = ["empreinte_charge"]
