"""Comptes, permissions, rôles et périmètres — RBAC maison (§5, §6.3).

Deux voies d'attribution des droits, cumulatives :

1. **Par rôle** (`AffectationRole`) : un rôle métier (ex. "greffier",
   "instructeur-visites") porte un ensemble de `Permission` et est accordé à
   l'utilisateur sur un périmètre (un établissement, une direction, ou national).
   C'est la voie normale — un profil = un paquet cohérent de droits.
2. **Par attribution directe** (`AttributionPermission`) : une permission précise
   accordée nommément à un utilisateur, hors rôle, pour les exceptions ponctuelles
   (délégation temporaire, habilitation individuelle) sans devoir créer un rôle
   dédié pour un seul agent.

`Utilisateur.scopes()` fusionne les deux voies ; `core.permissions.PossedeScope`
consomme ce résultat sans avoir à savoir d'où vient chaque droit.
"""

from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.id import uuid7
from core.models import ModeleBase, ModeleHorodate

from .managers import GestionnaireUtilisateur


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    """Compte nominatif. `est_agent_interne=True` déclenche l'exigence de MFA (§6.3)."""

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    email = models.EmailField(unique=True)
    nom = models.CharField(max_length=150)
    prenom = models.CharField(max_length=150)
    matricule = models.CharField(max_length=32, unique=True, null=True, blank=True)
    telephone = models.CharField(max_length=20, blank=True)

    est_agent_interne = models.BooleanField(
        default=False, help_text="Compte agent DGAP : MFA obligatoire, accès intranet/back-office."
    )
    est_superviseur_national = models.BooleanField(
        default=False,
        help_text="Bypass des vérifications de périmètre (direction générale, audit).",
    )
    mfa_active = models.BooleanField(default=False)
    compte_demonstration = models.BooleanField(
        default=False,
        help_text=(
            "Compte de démonstration (script de seed) : dispensé du MFA pour rester "
            "utilisable immédiatement par login/mot de passe. Jamais vrai en production."
        ),
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    derniere_connexion_reussie = models.DateTimeField(null=True, blank=True)

    objects = GestionnaireUtilisateur()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nom", "prenom"]

    class Meta:
        db_table = "utilisateurs"
        ordering = ["nom", "prenom"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.prenom} {self.nom} <{self.email}>"

    def get_full_name(self) -> str:
        return f"{self.prenom} {self.nom}".strip()

    def get_short_name(self) -> str:
        return self.prenom

    @property
    def mfa_requis(self) -> bool:
        return self.est_agent_interne and not self.compte_demonstration

    def scopes(self) -> set[str]:
        """Codes de permission effectifs : rôles actifs ∪ attributions directes actives."""
        via_roles = Permission.objects.filter(
            roles__affectations__utilisateur=self,
            roles__affectations__actif=True,
        ).values_list("code", flat=True)
        via_attribution_directe = Permission.objects.filter(
            attributions_directes__utilisateur=self,
            attributions_directes__actif=True,
        ).values_list("code", flat=True)
        return set(via_roles) | set(via_attribution_directe)

    def perimetres_autorises(self) -> set[str]:
        """Codes de périmètre couverts, toutes voies d'attribution confondues."""
        via_roles = (
            AffectationRole.objects.filter(utilisateur=self, actif=True)
            .exclude(perimetre__isnull=True)
            .values_list("perimetre__code", flat=True)
        )
        via_attribution_directe = (
            AttributionPermission.objects.filter(utilisateur=self, actif=True)
            .exclude(perimetre__isnull=True)
            .values_list("perimetre__code", flat=True)
        )
        return set(via_roles) | set(via_attribution_directe)


class Perimetre(ModeleHorodate):
    """Portée organisationnelle d'une affectation : un établissement ou une direction.

    Modèle volontairement minimal en Phase 0 : le lien vers les entités réelles
    (apps.etablissements.Etablissement, apps.referentiels.Structure) est ajouté par
    migration de données lorsque ces apps sont livrées (Bloc B).
    """

    class TypePerimetre(models.TextChoices):
        NATIONAL = "NATIONAL", "National"
        DIRECTION = "DIRECTION", "Direction"
        ETABLISSEMENT = "ETABLISSEMENT", "Établissement"

    type = models.CharField(max_length=20, choices=TypePerimetre.choices)
    code = models.SlugField(max_length=64, unique=True)
    libelle = models.CharField(max_length=200)

    class Meta:
        db_table = "perimetres"
        ordering = ["libelle"]

    def __str__(self) -> str:  # pragma: no cover
        return self.libelle


class Permission(ModeleHorodate):
    """Droit élémentaire (ex. `visites:instruire`, `concours:publier`, `stats:exporter`).

    `categorie` regroupe les permissions par module métier pour l'ergonomie de
    l'administration (un module = un préfixe de code, ex. toutes les `visites:*`).
    """

    code = models.SlugField(
        max_length=100, unique=True, help_text="Format conseillé : module:action."
    )
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=50, blank=True, db_index=True)

    class Meta:
        db_table = "permissions"
        ordering = ["categorie", "code"]

    def __str__(self) -> str:  # pragma: no cover
        return self.code


class Role(ModeleHorodate):
    code = models.SlugField(max_length=64, unique=True)
    libelle = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, related_name="roles", blank=True)

    class Meta:
        db_table = "roles"
        ordering = ["libelle"]

    def __str__(self) -> str:  # pragma: no cover
        return self.libelle


class AffectationRole(ModeleBase):
    """Attribution d'un rôle (donc de ses permissions) à un utilisateur, sur un périmètre."""

    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, related_name="affectations"
    )
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="affectations")
    perimetre = models.ForeignKey(
        Perimetre,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="affectations_role",
        help_text="Vide = portée nationale (réservé aux rôles habilités).",
    )
    actif = models.BooleanField(default=True)
    date_debut = models.DateField(default=timezone.localdate)
    date_fin = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "affectations_role"
        constraints = [
            models.UniqueConstraint(
                fields=["utilisateur", "role", "perimetre"],
                name="uniq_affectation_utilisateur_role_perimetre",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.utilisateur} — {self.role} @ {self.perimetre or 'national'}"


class AttributionPermission(ModeleBase):
    """Attribution directe d'une permission à un utilisateur, hors rôle (exception ponctuelle).

    À réserver aux cas où créer/modifier un rôle serait disproportionné (délégation
    nominative temporaire, habilitation individuelle). L'attribution par rôle reste la
    voie normale — voir le docstring de module.
    """

    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, related_name="attributions_permission"
    )
    permission = models.ForeignKey(
        Permission, on_delete=models.CASCADE, related_name="attributions_directes"
    )
    perimetre = models.ForeignKey(
        Perimetre,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="attributions_permission",
        help_text="Vide = portée nationale.",
    )
    motif = models.CharField(
        max_length=255, blank=True, help_text="Raison de l'exception (traçabilité)."
    )
    actif = models.BooleanField(default=True)
    date_debut = models.DateField(default=timezone.localdate)
    date_fin = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "attributions_permission"
        constraints = [
            models.UniqueConstraint(
                fields=["utilisateur", "permission", "perimetre"],
                name="uniq_attribution_utilisateur_permission_perimetre",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.utilisateur} — {self.permission} @ {self.perimetre or 'national'}"
