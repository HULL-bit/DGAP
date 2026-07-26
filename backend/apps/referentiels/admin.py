from django.contrib import admin

from .models import DirectionRegionale, Region, TypeEtablissement


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ["nom", "code"]
    search_fields = ["nom", "code"]


@admin.register(DirectionRegionale)
class DirectionRegionaleAdmin(admin.ModelAdmin):
    list_display = ["nom", "code", "directeur_nom", "directeur_email"]
    search_fields = ["nom", "code", "directeur_nom"]
    filter_horizontal = ["regions"]


@admin.register(TypeEtablissement)
class TypeEtablissementAdmin(admin.ModelAdmin):
    list_display = ["libelle", "code"]
    search_fields = ["libelle", "code"]
