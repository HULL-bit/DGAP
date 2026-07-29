from django.contrib import admin

from .models import ProduitBoutique


@admin.register(ProduitBoutique)
class ProduitBoutiqueAdmin(admin.ModelAdmin):
    list_display = ["nom", "categorie", "prix", "prix_promotionnel", "disponible", "ordre"]
    list_filter = ["categorie", "disponible"]
    search_fields = ["nom"]
