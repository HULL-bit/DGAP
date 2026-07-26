from django.contrib import admin

from .models import Etablissement


@admin.register(Etablissement)
class EtablissementAdmin(admin.ModelAdmin):
    list_display = ["nom", "type", "direction_regionale", "region", "actif"]
    list_filter = ["type", "direction_regionale", "actif"]
    search_fields = ["nom", "code", "adresse"]
    autocomplete_fields = ["type", "direction_regionale", "region"]
