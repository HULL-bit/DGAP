"""Ressources humaines — RH (M8) et reste des demandes internes (M7), jamais
exposé côté public (intranet/back-office interne uniquement, scopes `rh:*`).

Portée de cette première passe (EF-801, EF-802, EF-703 — « Obligatoire », EF-704
et EF-706 — « Important »/« Obligatoire », inclus car quasi gratuits une fois
EF-801 livré) : référentiel du personnel en extension de `comptes.Utilisateur`
(identité/authentification restent portées par ce dernier), historique
d'affectations, actes de carrière avec circuit de validation hiérarchique,
demandes administratives (congés, permissions d'absence, attestations de
travail) avec soldes de congés et circuit de validation, dossier agent en
self-service, annuaire interne.

`corps`/`grade` sont des champs texte libres plutôt qu'une énumération : le
cahier des charges ne fixe pas de nomenclature (contrairement à la position
administrative, qui est un statut réglementaire standard de la fonction
publique) — un référentiel versionné (mentionné §9.3) est une décision à
prendre séparément, pas à fabriquer ici.

Non couvert (dépendances non livrées ou hors périmètre produit) :
- EF-705 (formation) — catalogue, inscriptions, validations : un sous-domaine
  entier distinct, non construit cette passe.
- EF-706, volet « organigramme dynamique » — l'annuaire (recherche, fiche
  agent) est couvert ; la hiérarchie visuelle par structure suppose un parent
  sur `comptes.Perimetre` (modèle partagé RBAC), une décision de modélisation
  qui dépasse le périmètre de cette passe.
- EF-707 (calendrier institutionnel) — nouveau sous-domaine (événements,
  abonnements), non construit.
- EF-708 (messagerie de service interne) — bien qu'adossée à la GEC désormais
  livrée (`apps.courrier`), un flux de transmission tracée dédié inter-services
  reste un sous-domaine distinct, non construit cette passe.
- EF-803 (tableaux d'avancement automatisés) — règles statutaires d'ancienneté :
  moteur de règles non construit.
- EF-804 (évaluations) — campagnes dématérialisées : sous-domaine distinct.
- EF-805 (gestion prévisionnelle) — pyramide des âges/grades : nécessiterait une
  volumétrie réelle de dossiers pour être pertinente, non construite.
- EF-806 (affectations et mobilité — vœux, commissions dématérialisées) — non
  construit ; seul l'historique d'affectation (partie d'EF-801) est couvert.
- EF-807 (interfaces paie) — export vers un système de solde externe non
  spécifié dans ce projet.
"""

from __future__ import annotations

from decimal import Decimal

from django.db import models
from django.utils import timezone

from core.models import ModeleAvecSuppressionLogique, ModeleBase


class PositionAdministrative(models.TextChoices):
    ACTIVITE = "ACTIVITE", "Activité"
    DETACHEMENT = "DETACHEMENT", "Détachement"
    DISPONIBILITE = "DISPONIBILITE", "Disponibilité"
    CONGE_LONGUE_DUREE = "CONGE_LONGUE_DUREE", "Congé de longue durée"
    RETRAITE = "RETRAITE", "Retraite"


class SituationFamiliale(models.TextChoices):
    CELIBATAIRE = "CELIBATAIRE", "Célibataire"
    MARIE = "MARIE", "Marié(e)"
    DIVORCE = "DIVORCE", "Divorcé(e)"
    VEUF = "VEUF", "Veuf(ve)"


class DossierAgent(ModeleAvecSuppressionLogique):
    """Extension RH de `comptes.Utilisateur` (EF-801) — un seul dossier par
    compte agent."""

    utilisateur = models.OneToOneField(
        "comptes.Utilisateur", on_delete=models.CASCADE, related_name="dossier_rh"
    )
    corps = models.CharField(max_length=150, blank=True, db_index=True)
    grade = models.CharField(max_length=150, blank=True, db_index=True)
    position_administrative = models.CharField(
        max_length=20,
        choices=PositionAdministrative.choices,
        default=PositionAdministrative.ACTIVITE,
    )
    situation_familiale = models.CharField(
        max_length=20, choices=SituationFamiliale.choices, blank=True
    )
    date_entree_service = models.DateField(null=True, blank=True)
    diplomes = models.TextField(blank=True, help_text="Un diplôme par ligne.")

    class Meta:
        db_table = "dossiers_agent_rh"
        verbose_name = "Dossier agent (RH)"

    def __str__(self) -> str:  # pragma: no cover
        return f"Dossier RH — {self.utilisateur.get_full_name()}"

    @property
    def affectation_active(self) -> AffectationAgent | None:
        return self.affectations.filter(date_fin__isnull=True).order_by("-date_debut").first()


class AffectationAgent(ModeleBase):
    """Historique des affectations successives (EF-801) — distinct de
    `comptes.AffectationRole` (RBAC, permissions) : ceci est un historique
    métier RH, pas une attribution de droits."""

    dossier = models.ForeignKey(DossierAgent, on_delete=models.CASCADE, related_name="affectations")
    perimetre = models.ForeignKey("comptes.Perimetre", on_delete=models.PROTECT, related_name="+")
    fonction = models.CharField(max_length=200, blank=True)
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "affectations_agent_rh"
        ordering = ["-date_debut"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.dossier} — {self.perimetre} ({self.fonction})"

    @property
    def est_active(self) -> bool:
        return self.date_fin is None


class TransitionInvalide(Exception):
    def __init__(self, statut_actuel: str, action: str):
        self.statut_actuel = statut_actuel
        self.action = action
        super().__init__(f"Transition « {action} » impossible depuis le statut {statut_actuel}.")


class TypeActeCarriere(models.TextChoices):
    TITULARISATION = "TITULARISATION", "Titularisation"
    AVANCEMENT = "AVANCEMENT", "Avancement"
    MUTATION = "MUTATION", "Mutation"
    DETACHEMENT = "DETACHEMENT", "Détachement"
    DISPONIBILITE = "DISPONIBILITE", "Disponibilité"
    RETRAITE = "RETRAITE", "Retraite"


class StatutActeCarriere(models.TextChoices):
    BROUILLON = "BROUILLON", "Brouillon"
    SOUMIS = "SOUMIS", "Soumis"
    VALIDE = "VALIDE", "Validé"
    REJETE = "REJETE", "Rejeté"


TRANSITIONS_ACTE: dict[str, dict[str, str]] = {
    StatutActeCarriere.BROUILLON: {"soumettre": StatutActeCarriere.SOUMIS},
    StatutActeCarriere.SOUMIS: {
        "valider": StatutActeCarriere.VALIDE,
        "rejeter": StatutActeCarriere.REJETE,
    },
    StatutActeCarriere.REJETE: {"soumettre": StatutActeCarriere.SOUMIS},
}

SCOPE_PAR_ACTION_ACTE: dict[str, str] = {
    "soumettre": "rh:gerer",
    "valider": "rh:valider",
    "rejeter": "rh:valider",
}


def generer_numero_acte() -> str:
    """Format `DGAP-ACT-AAAA-XXXXXX`."""
    annee = timezone.now().year
    prefixe = f"DGAP-ACT-{annee}-"
    compte = ActeCarriere.tous_les_objets.filter(numero__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:06d}"


class ActeCarriere(ModeleAvecSuppressionLogique):
    """Acte de carrière (EF-802) — la validation applique l'effet correspondant
    sur `DossierAgent`/`AffectationAgent` (nouveau grade, nouvelle position
    administrative, ou nouvelle affectation pour une mutation)."""

    numero = models.CharField(max_length=30, unique=True, editable=False)
    dossier = models.ForeignKey(
        DossierAgent, on_delete=models.CASCADE, related_name="actes_carriere"
    )
    type_acte = models.CharField(max_length=20, choices=TypeActeCarriere.choices)
    statut = models.CharField(
        max_length=15, choices=StatutActeCarriere.choices, default=StatutActeCarriere.BROUILLON
    )
    date_effet = models.DateField()
    motif = models.TextField(blank=True)
    nouveau_grade = models.CharField(max_length=150, blank=True)
    nouveau_perimetre = models.ForeignKey(
        "comptes.Perimetre",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Renseigné pour une mutation.",
    )
    nouvelle_fonction = models.CharField(max_length=200, blank=True)
    valide_par = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    date_validation = models.DateTimeField(null=True, blank=True)
    motif_rejet = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "actes_carriere_rh"
        ordering = ["-cree_le"]
        verbose_name = "Acte de carrière"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.numero} — {self.get_type_acte_display()}"

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = generer_numero_acte()
        super().save(*args, **kwargs)

    def _appliquer_effet(self) -> None:
        dossier = self.dossier
        if self.type_acte == TypeActeCarriere.AVANCEMENT and self.nouveau_grade:
            dossier.grade = self.nouveau_grade
            dossier.save(update_fields=["grade", "modifie_le"])
        elif self.type_acte == TypeActeCarriere.MUTATION and self.nouveau_perimetre is not None:
            affectation_active = dossier.affectation_active
            if affectation_active is not None:
                affectation_active.date_fin = self.date_effet
                affectation_active.save(update_fields=["date_fin"])
            AffectationAgent.objects.create(
                dossier=dossier,
                perimetre=self.nouveau_perimetre,
                fonction=self.nouvelle_fonction,
                date_debut=self.date_effet,
            )
        elif self.type_acte in (
            TypeActeCarriere.DETACHEMENT,
            TypeActeCarriere.DISPONIBILITE,
            TypeActeCarriere.RETRAITE,
        ):
            dossier.position_administrative = self.type_acte
            dossier.save(update_fields=["position_administrative", "modifie_le"])

    def transitionner(self, action: str, acteur=None, motif_rejet: str = "") -> None:
        transitions = TRANSITIONS_ACTE.get(self.statut, {})
        nouveau_statut = transitions.get(action)
        if nouveau_statut is None:
            raise TransitionInvalide(self.statut, action)

        self.statut = nouveau_statut
        if action == "valider":
            self.valide_par = acteur
            self.date_validation = timezone.now()
            self._appliquer_effet()
        if action == "rejeter":
            self.motif_rejet = motif_rejet
        if acteur is not None:
            self.modifie_par = acteur
        self.save()


class TypeDemandeRH(models.TextChoices):
    CONGE = "CONGE", "Congé"
    PERMISSION_ABSENCE = "PERMISSION_ABSENCE", "Permission d'absence"
    ATTESTATION_TRAVAIL = "ATTESTATION_TRAVAIL", "Attestation de travail"
    AUTRE = "AUTRE", "Autre demande"


class StatutDemandeRH(models.TextChoices):
    SOUMISE = "SOUMISE", "Soumise"
    VALIDEE = "VALIDEE", "Validée"
    REJETEE = "REJETEE", "Rejetée"
    ANNULEE = "ANNULEE", "Annulée"


TRANSITIONS_DEMANDE: dict[str, dict[str, str]] = {
    StatutDemandeRH.SOUMISE: {
        "valider": StatutDemandeRH.VALIDEE,
        "rejeter": StatutDemandeRH.REJETEE,
        "annuler": StatutDemandeRH.ANNULEE,
    },
}

SCOPE_PAR_ACTION_DEMANDE: dict[str, str] = {"valider": "rh:valider", "rejeter": "rh:valider"}


def generer_numero_demande() -> str:
    """Format `DGAP-RH-AAAA-XXXXXX`."""
    annee = timezone.now().year
    prefixe = f"DGAP-RH-{annee}-"
    compte = DemandeRH.tous_les_objets.filter(numero__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:06d}"


class DemandeRH(ModeleAvecSuppressionLogique):
    """Demande administrative (EF-703) — congé, permission d'absence, attestation
    de travail. La validation d'un congé décrémente le solde de l'année du
    `date_debut`."""

    numero = models.CharField(max_length=30, unique=True, editable=False)
    dossier = models.ForeignKey(DossierAgent, on_delete=models.CASCADE, related_name="demandes")
    type_demande = models.CharField(max_length=25, choices=TypeDemandeRH.choices)
    statut = models.CharField(
        max_length=15, choices=StatutDemandeRH.choices, default=StatutDemandeRH.SOUMISE
    )
    date_debut = models.DateField(
        null=True, blank=True, help_text="Congé/permission : premier jour."
    )
    date_fin = models.DateField(null=True, blank=True)
    motif = models.TextField(blank=True)
    valide_par = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    date_validation = models.DateTimeField(null=True, blank=True)
    motif_rejet = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "demandes_rh"
        ordering = ["-cree_le"]
        verbose_name = "Demande administrative (RH)"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.numero} — {self.get_type_demande_display()}"

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = generer_numero_demande()
        super().save(*args, **kwargs)

    @property
    def nombre_jours(self) -> int | None:
        if self.date_debut and self.date_fin:
            return (self.date_fin - self.date_debut).days + 1
        return None

    def _decompter_solde_conge(self) -> None:
        if self.type_demande != TypeDemandeRH.CONGE or not self.date_debut or not self.nombre_jours:
            return
        solde, _ = SoldeConge.objects.get_or_create(
            dossier=self.dossier, annee=self.date_debut.year
        )
        solde.jours_pris = solde.jours_pris + self.nombre_jours
        solde.save(update_fields=["jours_pris"])

    def transitionner(self, action: str, acteur=None, motif_rejet: str = "") -> None:
        transitions = TRANSITIONS_DEMANDE.get(self.statut, {})
        nouveau_statut = transitions.get(action)
        if nouveau_statut is None:
            raise TransitionInvalide(self.statut, action)

        self.statut = nouveau_statut
        if action == "valider":
            self.valide_par = acteur
            self.date_validation = timezone.now()
            self._decompter_solde_conge()
        if action == "rejeter":
            self.motif_rejet = motif_rejet
        if acteur is not None:
            self.modifie_par = acteur
        self.save()

        if action in ("valider", "rejeter") and self.dossier.utilisateur.email:
            from apps.notifications.services import notifier

            libelle_statut = "validée" if action == "valider" else "rejetée"
            notifier(
                email=self.dossier.utilisateur.email,
                sujet=f"Votre demande {self.numero} a été {libelle_statut}",
                contenu=(
                    f"Votre demande ({self.get_type_demande_display()}) a été {libelle_statut}."
                    + (f" Motif : {motif_rejet}" if action == "rejeter" and motif_rejet else "")
                ),
                objet_source=self,
            )


class SoldeConge(ModeleBase):
    """Compteur individuel de jours de congé par année (EF-703) — l'attribution
    initiale (`jours_acquis`) est une action administrative RH, pas une valeur
    légale fabriquée ici."""

    dossier = models.ForeignKey(DossierAgent, on_delete=models.CASCADE, related_name="soldes_conge")
    annee = models.PositiveSmallIntegerField()
    jours_acquis = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    jours_pris = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        db_table = "soldes_conge_rh"
        ordering = ["-annee"]
        constraints = [
            models.UniqueConstraint(
                fields=["dossier", "annee"], name="uniq_solde_conge_dossier_annee"
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.dossier} — {self.annee}"

    @property
    def jours_restants(self) -> Decimal:
        return self.jours_acquis - self.jours_pris


def dossiers_visibles_par(utilisateur) -> models.QuerySet[DossierAgent]:
    """RH (`rh:gerer`) voit tous les dossiers ; un agent ne voit que le sien
    (self-service, EF-704)."""
    if "rh:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national:
        return DossierAgent.objets.all()
    return DossierAgent.objets.filter(utilisateur=utilisateur)


def demandes_visibles_par(utilisateur) -> models.QuerySet[DemandeRH]:
    """RH voit tout ; un validateur (`rh:valider`) voit les demandes des agents
    dont le périmètre actuel figure parmi ses périmètres autorisés ; un agent voit
    ses propres demandes."""
    if "rh:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national:
        return DemandeRH.objets.all()
    qs_propres = models.Q(dossier__utilisateur=utilisateur)
    if "rh:valider" in utilisateur.scopes():
        perimetres = utilisateur.perimetres_autorises()
        qs_propres |= models.Q(dossier__affectations__perimetre__code__in=perimetres) & models.Q(
            dossier__affectations__date_fin__isnull=True
        )
    return DemandeRH.objets.filter(qs_propres).distinct()


def actes_visibles_par(utilisateur) -> models.QuerySet[ActeCarriere]:
    """RH voit tout ; un validateur (`rh:valider`) voit les actes des agents dont
    le périmètre actuel figure parmi ses périmètres autorisés."""
    if "rh:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national:
        return ActeCarriere.objets.all()
    if "rh:valider" in utilisateur.scopes():
        perimetres = utilisateur.perimetres_autorises()
        return ActeCarriere.objets.filter(
            dossier__affectations__perimetre__code__in=perimetres,
            dossier__affectations__date_fin__isnull=True,
        ).distinct()
    return ActeCarriere.objets.none()
