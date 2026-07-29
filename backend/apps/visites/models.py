"""Téléservice Visites (M3, Bloc D) — dépôt en ligne, instruction, permis PDF+QR
signé (§5, §7.3). La personne détenue n'est jamais liée à `apps.detenus` (non
construite, Bloc G) : elle est référencée par les seules informations saisies par le
visiteur, jamais exposées publiquement au-delà de ce que le demandeur a lui-même
fourni (§6.3 — cloisonnement).
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import date, timedelta

from django.db import models
from django.utils import timezone

from core.models import ModeleAvecSuppressionLogique, ModeleHorodate


class StatutDemandeVisite(models.TextChoices):
    SOUMISE = "SOUMISE", "Soumise"
    EN_INSTRUCTION = "EN_INSTRUCTION", "En instruction"
    PIECES_MANQUANTES = "PIECES_MANQUANTES", "Pièces manquantes"
    VALIDEE = "VALIDEE", "Validée"
    REJETEE = "REJETEE", "Rejetée"
    PERMIS_DELIVRE = "PERMIS_DELIVRE", "Permis délivré"


# Transitions autorisées : statut de départ -> {action: statut d'arrivée}. Même
# principe que `apps.contenus.models.TRANSITIONS_AUTORISEES` (Bloc C).
TRANSITIONS_AUTORISEES: dict[str, dict[str, str]] = {
    StatutDemandeVisite.SOUMISE: {
        "instruire": StatutDemandeVisite.EN_INSTRUCTION,
    },
    StatutDemandeVisite.EN_INSTRUCTION: {
        "demander_pieces": StatutDemandeVisite.PIECES_MANQUANTES,
        "valider": StatutDemandeVisite.VALIDEE,
        "rejeter": StatutDemandeVisite.REJETEE,
    },
    StatutDemandeVisite.PIECES_MANQUANTES: {
        "instruire": StatutDemandeVisite.EN_INSTRUCTION,
    },
    StatutDemandeVisite.VALIDEE: {
        "delivrer_permis": StatutDemandeVisite.PERMIS_DELIVRE,
        "rejeter": StatutDemandeVisite.REJETEE,
    },
}

SCOPE_PAR_ACTION: dict[str, str] = {
    "instruire": "visites:instruire",
    "demander_pieces": "visites:instruire",
    "valider": "visites:instruire",
    "rejeter": "visites:instruire",
    "delivrer_permis": "visites:instruire",
}

# Phrase insérée dans la notification envoyée à chaque changement d'état (EF-302) —
# pas de notification pour SOUMISE (couverte par l'accusé de réception au dépôt).
MESSAGES_PAR_STATUT: dict[str, str] = {
    StatutDemandeVisite.EN_INSTRUCTION: "est en cours d'instruction",
    StatutDemandeVisite.PIECES_MANQUANTES: (
        "nécessite des pièces complémentaires — contactez l'établissement"
    ),
    StatutDemandeVisite.VALIDEE: "a été validée",
    StatutDemandeVisite.REJETEE: "a été rejetée",
    StatutDemandeVisite.PERMIS_DELIVRE: "a été acceptée : le permis de visite est disponible",
}


class TransitionInvalide(Exception):
    def __init__(self, statut_actuel: str, action: str):
        self.statut_actuel = statut_actuel
        self.action = action
        super().__init__(f"Transition « {action} » impossible depuis le statut {statut_actuel}.")


def generer_numero_suivi() -> str:
    """Format `DGAP-VIS-AAAA-XXXXXX` (§5)."""
    annee = timezone.now().year
    prefixe = f"DGAP-VIS-{annee}-"
    compte = DemandeVisite.tous_les_objets.filter(numero_suivi__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:06d}"


def generer_code_suivi() -> str:
    """Code court complémentaire au numéro pour le suivi public restreint (§6.2)."""
    return secrets.token_hex(3).upper()  # 6 caractères hexadécimaux


class CreneauVisite(ModeleHorodate):
    etablissement = models.ForeignKey(
        "etablissements.Etablissement", on_delete=models.CASCADE, related_name="creneaux_visite"
    )
    jour = models.DateField()
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    capacite = models.PositiveIntegerField(default=10)

    class Meta:
        db_table = "creneaux_visite"
        ordering = ["jour", "heure_debut"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.etablissement} — {self.jour} {self.heure_debut}-{self.heure_fin}"

    def places_restantes(self) -> int:
        return max(
            0, self.capacite - self.demandes.exclude(statut=StatutDemandeVisite.REJETEE).count()
        )


class DemandeVisite(ModeleAvecSuppressionLogique):
    numero_suivi = models.CharField(max_length=30, unique=True, editable=False)
    code_suivi = models.CharField(max_length=10, editable=False)

    # Visiteur (personne qui demande la visite — jamais confondu avec la personne détenue).
    visiteur_nom = models.CharField(max_length=150)
    visiteur_prenom = models.CharField(max_length=150)
    visiteur_email = models.EmailField()
    visiteur_telephone = models.CharField(max_length=30)
    lien_parente = models.CharField(max_length=100)

    # Personne détenue : uniquement ce que le visiteur déclare (§6.3 — aucune
    # confirmation nominative de présence, aucune liaison à apps.detenus pour l'instant).
    detenu_nom_declare = models.CharField(max_length=150)
    detenu_prenom_declare = models.CharField(max_length=150)

    etablissement = models.ForeignKey(
        "etablissements.Etablissement", on_delete=models.PROTECT, related_name="demandes_visite"
    )
    date_souhaitee = models.DateField()
    creneau = models.ForeignKey(
        CreneauVisite, on_delete=models.SET_NULL, null=True, blank=True, related_name="demandes"
    )

    statut = models.CharField(
        max_length=20, choices=StatutDemandeVisite.choices, default=StatutDemandeVisite.SOUMISE
    )
    motif_rejet = models.TextField(blank=True)
    instructeur = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    date_instruction = models.DateTimeField(null=True, blank=True)

    #: En-tête `Idempotency-Key` du dépôt initial (§6.1) — évite les doublons de
    #: soumission (CR-V-02) en cas de perte de connexion/double clic.
    cle_idempotence = models.CharField(max_length=80, unique=True, null=True, blank=True)

    class Meta:
        db_table = "demandes_visite"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.numero_suivi

    def save(self, *args, **kwargs):
        if not self.numero_suivi:
            self.numero_suivi = generer_numero_suivi()
        if not self.code_suivi:
            self.code_suivi = generer_code_suivi()
        super().save(*args, **kwargs)

    def transitionner(self, action: str, acteur=None, motif: str = "") -> None:
        transitions = TRANSITIONS_AUTORISEES.get(self.statut, {})
        nouveau_statut = transitions.get(action)
        if nouveau_statut is None:
            raise TransitionInvalide(self.statut, action)

        self.statut = nouveau_statut
        self.date_instruction = timezone.now()
        if acteur is not None:
            self.instructeur = acteur
            self.modifie_par = acteur
        if action == "rejeter":
            self.motif_rejet = motif
        self.save()
        self._notifier_changement_statut()

    def _notifier_changement_statut(self) -> None:
        from apps.notifications.services import notifier

        phrase = MESSAGES_PAR_STATUT.get(self.statut)
        if not phrase:
            return
        motif = (
            f"Motif : {self.motif_rejet}\n\n"
            if self.statut == StatutDemandeVisite.REJETEE and self.motif_rejet
            else ""
        )
        notifier(
            email=self.visiteur_email,
            telephone=self.visiteur_telephone,
            sujet=f"Votre demande de visite {self.numero_suivi} — DGAP",
            contenu=(
                f"Bonjour,\n\nVotre demande de visite {self.numero_suivi} {phrase}.\n\n"
                f"{motif}"
                "Consultez le détail sur la page de suivi avec votre numéro et votre code.\n\n"
                "Ce message est envoyé automatiquement, merci de ne pas y répondre."
            ),
            objet_source=self,
        )


class TypePieceVisite(models.TextChoices):
    CNI_VISITEUR = "CNI_VISITEUR", "Pièce d'identité du visiteur"
    PERMIS_COMMUNIQUER = "PERMIS_COMMUNIQUER", "Permis de communiquer existant"
    AUTRE = "AUTRE", "Autre document"


class StatutControlePiece(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente de contrôle"
    LISIBLE = "LISIBLE", "Lisible"
    ILLISIBLE = "ILLISIBLE", "Illisible — à representer"


def chemin_piece_jointe(instance: PieceJointeVisite, nom_fichier: str) -> str:
    return f"visites/{instance.demande_id}/{nom_fichier}"


class PieceJointeVisite(ModeleHorodate):
    demande = models.ForeignKey(DemandeVisite, on_delete=models.CASCADE, related_name="pieces")
    type_piece = models.CharField(max_length=30, choices=TypePieceVisite.choices)
    fichier = models.FileField(upload_to=chemin_piece_jointe)
    empreinte_sha256 = models.CharField(max_length=64, editable=False, blank=True)
    statut_controle = models.CharField(
        max_length=20, choices=StatutControlePiece.choices, default=StatutControlePiece.EN_ATTENTE
    )

    class Meta:
        db_table = "pieces_jointes_visite"
        ordering = ["-cree_le"]

    def save(self, *args, **kwargs):
        if self.fichier and not self.empreinte_sha256:
            hachage = hashlib.sha256()
            for bloc in self.fichier.chunks():
                hachage.update(bloc)
            self.empreinte_sha256 = hachage.hexdigest()
            self.fichier.seek(0)
        super().save(*args, **kwargs)


class PermisVisite(ModeleHorodate):
    demande = models.OneToOneField(DemandeVisite, on_delete=models.CASCADE, related_name="permis")
    numero_permis = models.CharField(max_length=40, unique=True, editable=False)
    charge_qr_jws = models.TextField(
        editable=False, help_text="Charge signée (JWS) encodée dans le QR."
    )
    valide_jusqu_au = models.DateField()
    revoque = models.BooleanField(default=False)

    class Meta:
        db_table = "permis_visite"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.numero_permis

    @staticmethod
    def generer_numero(demande: DemandeVisite) -> str:
        return f"PV-{demande.numero_suivi.removeprefix('DGAP-VIS-')}"

    @staticmethod
    def duree_validite_par_defaut() -> date:
        return (timezone.now() + timedelta(days=90)).date()
