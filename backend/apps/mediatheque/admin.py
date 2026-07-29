from django.contrib import admin

from .models import DocumentPublic, Galerie, MediaGalerie


@admin.register(DocumentPublic)
class DocumentPublicAdmin(admin.ModelAdmin):
    list_display = ["titre", "nature", "numero", "date_texte", "statut", "publie"]
    list_filter = ["nature", "statut", "categorie", "publie"]
    search_fields = ["titre", "numero"]


class MediaGalerieInline(admin.TabularInline):
    model = MediaGalerie
    extra = 0


@admin.register(Galerie)
class GalerieAdmin(admin.ModelAdmin):
    list_display = ["titre", "code"]
    search_fields = ["titre", "code"]
    inlines = [MediaGalerieInline]
