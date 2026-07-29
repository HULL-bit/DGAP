from django.contrib import admin

from .models import Mouvement, PersonneDetenue


class MouvementInline(admin.TabularInline):
    model = Mouvement
    extra = 0
    readonly_fields = [
        "type_mouvement",
        "date_mouvement",
        "etablissement_destination",
        "motif",
        "cree_par",
        "cree_le",
    ]


@admin.register(PersonneDetenue)
class PersonneDetenueAdmin(admin.ModelAdmin):
    list_display = [
        "numero_ecrou",
        "nom",
        "prenom",
        "etablissement",
        "statut_dossier",
        "situation_penale",
    ]
    list_filter = ["statut_dossier", "situation_penale", "regime", "etablissement"]
    # Recherche limitée au numéro d'écrou : nom/prénom sont chiffrés avec un nonce
    # aléatoire, donc jamais indexables/recherchables tels quels en base.
    search_fields = ["numero_ecrou"]
    readonly_fields = ["numero_ecrou"]
    inlines = [MouvementInline]
