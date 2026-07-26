from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AffectationRole, AttributionPermission, Perimetre, Permission, Role, Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    model = Utilisateur
    ordering = ["nom", "prenom"]
    list_display = [
        "email",
        "nom",
        "prenom",
        "est_agent_interne",
        "mfa_active",
        "is_active",
        "is_staff",
    ]
    search_fields = ["email", "nom", "prenom", "matricule"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité", {"fields": ("nom", "prenom", "matricule", "telephone")}),
        (
            "Habilitations",
            {
                "fields": (
                    "est_agent_interne",
                    "est_superviseur_national",
                    "mfa_active",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {"classes": ("wide",), "fields": ("email", "nom", "prenom", "password1", "password2")},
        ),
    )


@admin.register(Perimetre)
class PerimetreAdmin(admin.ModelAdmin):
    list_display = ["libelle", "type", "code"]
    list_filter = ["type"]
    search_fields = ["libelle", "code"]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ["code", "libelle", "categorie"]
    list_filter = ["categorie"]
    search_fields = ["code", "libelle"]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["libelle", "code"]
    search_fields = ["libelle", "code"]
    filter_horizontal = ["permissions"]


@admin.register(AffectationRole)
class AffectationRoleAdmin(admin.ModelAdmin):
    list_display = ["utilisateur", "role", "perimetre", "actif", "date_debut", "date_fin"]
    list_filter = ["actif", "role"]
    autocomplete_fields = ["utilisateur", "role", "perimetre"]


@admin.register(AttributionPermission)
class AttributionPermissionAdmin(admin.ModelAdmin):
    """Attribution nominative d'une permission hors rôle — voir docstring du modèle."""

    list_display = ["utilisateur", "permission", "perimetre", "actif", "date_debut", "date_fin"]
    list_filter = ["actif", "permission__categorie"]
    autocomplete_fields = ["utilisateur", "permission", "perimetre"]
    fields = ["utilisateur", "permission", "perimetre", "motif", "actif", "date_debut", "date_fin"]
