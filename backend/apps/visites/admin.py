from django.contrib import admin

from .models import CreneauVisite, DemandeVisite, PermisVisite, PieceJointeVisite


class PieceJointeInline(admin.TabularInline):
    model = PieceJointeVisite
    extra = 0
    readonly_fields = ["empreinte_sha256", "cree_le"]


@admin.register(DemandeVisite)
class DemandeVisiteAdmin(admin.ModelAdmin):
    list_display = ["numero_suivi", "visiteur_nom", "etablissement", "statut", "date_souhaitee"]
    list_filter = ["statut", "etablissement"]
    search_fields = ["numero_suivi", "visiteur_nom", "visiteur_email"]
    readonly_fields = ["numero_suivi", "code_suivi", "cle_idempotence"]
    inlines = [PieceJointeInline]


@admin.register(CreneauVisite)
class CreneauVisiteAdmin(admin.ModelAdmin):
    list_display = ["etablissement", "jour", "heure_debut", "heure_fin", "capacite"]
    list_filter = ["etablissement"]


@admin.register(PermisVisite)
class PermisVisiteAdmin(admin.ModelAdmin):
    list_display = ["numero_permis", "demande", "valide_jusqu_au", "revoque"]
    readonly_fields = ["numero_permis", "charge_qr_jws"]
