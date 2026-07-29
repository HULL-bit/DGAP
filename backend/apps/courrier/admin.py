from django.contrib import admin

from .models import AffectationCourrier, CourrierEntrant, CourrierSortant, ReponseCourrier


class AffectationCourrierInline(admin.TabularInline):
    model = AffectationCourrier
    extra = 0
    readonly_fields = ["perimetre", "agent", "instructions", "cree_par", "cree_le"]


class ReponseCourrierInline(admin.TabularInline):
    model = ReponseCourrier
    extra = 0
    readonly_fields = ["statut", "signataire", "date_signature"]


@admin.register(CourrierEntrant)
class CourrierEntrantAdmin(admin.ModelAdmin):
    list_display = ["numero", "expediteur", "objet", "confidentialite", "statut", "date_reception"]
    list_filter = ["confidentialite", "statut"]
    search_fields = ["numero", "expediteur", "objet"]
    inlines = [AffectationCourrierInline, ReponseCourrierInline]


@admin.register(CourrierSortant)
class CourrierSortantAdmin(admin.ModelAdmin):
    list_display = ["numero", "destinataire", "objet", "statut", "date_envoi"]
    list_filter = ["statut"]
    search_fields = ["numero", "destinataire", "objet"]
