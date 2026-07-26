from django.contrib import admin

from .models import DocumentPublic


@admin.register(DocumentPublic)
class DocumentPublicAdmin(admin.ModelAdmin):
    list_display = ["titre", "nature", "numero", "date_texte", "statut", "publie"]
    list_filter = ["nature", "statut", "categorie", "publie"]
    search_fields = ["titre", "numero"]
