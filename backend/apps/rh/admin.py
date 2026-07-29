from django.contrib import admin

from .models import ActeCarriere, AffectationAgent, DemandeRH, DossierAgent, SoldeConge


class AffectationAgentInline(admin.TabularInline):
    model = AffectationAgent
    extra = 0
    readonly_fields = ["cree_par", "cree_le"]


class SoldeCongeInline(admin.TabularInline):
    model = SoldeConge
    extra = 0


@admin.register(DossierAgent)
class DossierAgentAdmin(admin.ModelAdmin):
    list_display = ["utilisateur", "corps", "grade", "position_administrative"]
    list_filter = ["position_administrative", "situation_familiale"]
    search_fields = ["utilisateur__nom", "utilisateur__prenom", "corps", "grade"]
    inlines = [AffectationAgentInline, SoldeCongeInline]


@admin.register(ActeCarriere)
class ActeCarriereAdmin(admin.ModelAdmin):
    list_display = ["numero", "dossier", "type_acte", "statut", "date_effet"]
    list_filter = ["type_acte", "statut"]
    search_fields = ["numero", "dossier__utilisateur__nom", "dossier__utilisateur__prenom"]
    readonly_fields = ["numero", "valide_par", "date_validation"]


@admin.register(DemandeRH)
class DemandeRHAdmin(admin.ModelAdmin):
    list_display = ["numero", "dossier", "type_demande", "statut", "date_debut", "date_fin"]
    list_filter = ["type_demande", "statut"]
    search_fields = ["numero", "dossier__utilisateur__nom", "dossier__utilisateur__prenom"]
    readonly_fields = ["numero", "valide_par", "date_validation"]
