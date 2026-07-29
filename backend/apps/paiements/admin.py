from django.contrib import admin

from .models import Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ["reference", "montant", "moyen", "statut", "paye_le", "cree_le"]
    list_filter = ["moyen", "statut"]
    search_fields = ["reference"]
