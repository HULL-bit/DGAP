from django.contrib import admin

from .models import Candidature, Concours, ConvocationCandidature, PieceJointeCandidature


class PieceJointeInline(admin.TabularInline):
    model = PieceJointeCandidature
    extra = 0
    readonly_fields = ["empreinte_sha256"]


@admin.register(Concours)
class ConcoursAdmin(admin.ModelAdmin):
    list_display = ["titre", "code", "statut", "date_ouverture", "date_cloture"]
    list_filter = ["statut"]
    search_fields = ["titre", "code"]


@admin.register(Candidature)
class CandidatureAdmin(admin.ModelAdmin):
    list_display = ["numero_suivi", "concours", "candidat_nom", "candidat_prenom", "statut"]
    list_filter = ["statut", "concours"]
    search_fields = ["numero_suivi", "candidat_nom", "candidat_email"]
    inlines = [PieceJointeInline]


@admin.register(ConvocationCandidature)
class ConvocationCandidatureAdmin(admin.ModelAdmin):
    list_display = ["numero_convocation", "candidature", "date_convocation"]
    search_fields = ["numero_convocation"]
