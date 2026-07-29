"""Téléservice Concours (M4, Bloc E) — avis de concours, dépôt de candidature en
ligne, instruction, convocation PDF+QR signée (§5, §7.4). Même patron que
`apps.visites` (Bloc D) : machine à états, dépôt public idempotent, suivi restreint
par numéro+code.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta

from django.db import models
from django.utils import timezone

from core.models import ModeleAvecSuppressionLogique, ModeleHorodate


class StatutConcours(models.TextChoices):
    BROUILLON = "BROUILLON", "Brouillon"
    OUVERT = "OUVERT", "Ouvert"
    CLOTURE = "CLOTURE", "Clôturé"
    RESULTATS_PUBLIES = "RESULTATS_PUBLIES", "Résultats publiés"


class Concours(ModeleAvecSuppressionLogique):
    titre = models.CharField(max_length=200)
    code = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    conditions = models.TextField(blank=True, help_text="Conditions d'accès, pièces exigées.")
    frais_inscription = models.DecimalField(
        max_digits=10, decimal_places=0, default=0, help_text="Montant en FCFA."
    )
    date_ouverture = models.DateField()
    date_cloture = models.DateField()
    date_concours = models.DateField(null=True, blank=True)
    places_disponibles = models.PositiveIntegerField(null=True, blank=True)
    statut = models.CharField(
        max_length=20, choices=StatutConcours.choices, default=StatutConcours.BROUILLON
    )
    document_avis = models.ForeignKey(
        "mediatheque.DocumentPublic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="concours",
        help_text="Avis officiel (PDF) publié dans les documents officiels, visible sur l'accueil.",
    )

    class Meta:
        db_table = "concours"
        ordering = ["-date_ouverture"]
        verbose_name_plural = "Concours"

    def __str__(self) -> str:  # pragma: no cover
        return self.titre

    def est_ouvert(self) -> bool:
        aujourdhui = timezone.now().date()
        return (
            self.statut == StatutConcours.OUVERT
            and self.date_ouverture <= aujourdhui <= self.date_cloture
        )


class StatutCandidature(models.TextChoices):
    SOUMISE = "SOUMISE", "Soumise"
    EN_INSTRUCTION = "EN_INSTRUCTION", "En instruction"
    PIECES_MANQUANTES = "PIECES_MANQUANTES", "Pièces manquantes"
    ADMISSIBLE = "ADMISSIBLE", "Admissible"
    CONVOQUE = "CONVOQUE", "Convoqué"
    ADMIS = "ADMIS", "Admis"
    REJETE = "REJETE", "Rejeté"


# Transitions autorisées : statut de départ -> {action: statut d'arrivée}. Même
# principe que `apps.visites.models.TRANSITIONS_AUTORISEES` (Bloc D).
TRANSITIONS_AUTORISEES: dict[str, dict[str, str]] = {
    StatutCandidature.SOUMISE: {
        "instruire": StatutCandidature.EN_INSTRUCTION,
    },
    StatutCandidature.EN_INSTRUCTION: {
        "demander_pieces": StatutCandidature.PIECES_MANQUANTES,
        "declarer_admissible": StatutCandidature.ADMISSIBLE,
        "rejeter": StatutCandidature.REJETE,
    },
    StatutCandidature.PIECES_MANQUANTES: {
        "instruire": StatutCandidature.EN_INSTRUCTION,
    },
    StatutCandidature.ADMISSIBLE: {
        "convoquer": StatutCandidature.CONVOQUE,
        "rejeter": StatutCandidature.REJETE,
    },
    StatutCandidature.CONVOQUE: {
        "admettre": StatutCandidature.ADMIS,
        "rejeter": StatutCandidature.REJETE,
    },
}

SCOPE_PAR_ACTION: dict[str, str] = {
    "instruire": "concours:instruire",
    "demander_pieces": "concours:instruire",
    "declarer_admissible": "concours:instruire",
    "convoquer": "concours:instruire",
    "admettre": "concours:instruire",
    "rejeter": "concours:instruire",
}

# Phrase insérée dans la notification envoyée à chaque changement d'état (EF-302) —
# pas de notification pour SOUMISE (couverte par l'accusé de réception au dépôt).
MESSAGES_PAR_STATUT: dict[str, str] = {
    StatutCandidature.EN_INSTRUCTION: "est en cours d'instruction",
    StatutCandidature.PIECES_MANQUANTES: "nécessite des pièces complémentaires",
    StatutCandidature.ADMISSIBLE: "a été déclarée admissible",
    StatutCandidature.CONVOQUE: "est convoquée — une convocation officielle a été générée",
    StatutCandidature.ADMIS: "a été admise — félicitations",
    StatutCandidature.REJETE: "a été rejetée",
}


class TransitionInvalide(Exception):
    def __init__(self, statut_actuel: str, action: str):
        self.statut_actuel = statut_actuel
        self.action = action
        super().__init__(f"Transition « {action} » impossible depuis le statut {statut_actuel}.")


def generer_numero_suivi() -> str:
    """Format `CONC-AAAA-XXXXXX` (§5). Simplifié par rapport au segment catégorie du
    document de cadrage initial — non spécifié précisément, et une numérotation
    séquentielle par année suffit au suivi public (cohérent avec `DGAP-VIS-AAAA-XXXXXX`)."""
    annee = timezone.now().year
    prefixe = f"CONC-{annee}-"
    compte = Candidature.tous_les_objets.filter(numero_suivi__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:06d}"


def generer_code_suivi() -> str:
    return secrets.token_hex(3).upper()


class Candidature(ModeleAvecSuppressionLogique):
    numero_suivi = models.CharField(max_length=30, unique=True, editable=False)
    code_suivi = models.CharField(max_length=10, editable=False)

    concours = models.ForeignKey(Concours, on_delete=models.PROTECT, related_name="candidatures")

    candidat_nom = models.CharField(max_length=150)
    candidat_prenom = models.CharField(max_length=150)
    candidat_email = models.EmailField()
    candidat_telephone = models.CharField(max_length=30)
    niveau_etude = models.CharField(max_length=150, blank=True)
    experience = models.TextField(blank=True)

    statut = models.CharField(
        max_length=20, choices=StatutCandidature.choices, default=StatutCandidature.SOUMISE
    )
    motif_rejet = models.TextField(blank=True)
    instructeur = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    date_instruction = models.DateTimeField(null=True, blank=True)

    #: En-tête `Idempotency-Key` du dépôt initial — évite les doublons de soumission.
    cle_idempotence = models.CharField(max_length=80, unique=True, null=True, blank=True)

    class Meta:
        db_table = "candidatures"
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
            if self.statut == StatutCandidature.REJETE and self.motif_rejet
            else ""
        )
        notifier(
            email=self.candidat_email,
            telephone=self.candidat_telephone,
            sujet=f"Votre candidature {self.numero_suivi} — DGAP",
            contenu=(
                f"Bonjour,\n\nVotre candidature {self.numero_suivi} {phrase}.\n\n"
                f"{motif}"
                "Consultez le détail sur la page de suivi avec votre numéro et votre code.\n\n"
                "Ce message est envoyé automatiquement, merci de ne pas y répondre."
            ),
            objet_source=self,
        )

    def paiement(self):
        """Paiement associé, s'il existe — relation générique (`apps.paiements`),
        même patron que `ContenuEditorial.versions()` (Bloc C)."""
        from django.contrib.contenttypes.models import ContentType

        from apps.paiements.models import Paiement

        return Paiement.objects.filter(
            content_type=ContentType.objects.get_for_model(Candidature), object_id=self.id
        ).first()


class TypePieceCandidature(models.TextChoices):
    CV = "CV", "Curriculum vitae"
    DIPLOME = "DIPLOME", "Diplôme"
    ATTESTATION = "ATTESTATION", "Attestation"
    AUTRE = "AUTRE", "Autre document"


class StatutControlePiece(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente de contrôle"
    LISIBLE = "LISIBLE", "Lisible"
    ILLISIBLE = "ILLISIBLE", "Illisible — à representer"


def chemin_piece_jointe(instance: PieceJointeCandidature, nom_fichier: str) -> str:
    return f"concours/{instance.candidature_id}/{nom_fichier}"


class PieceJointeCandidature(ModeleHorodate):
    candidature = models.ForeignKey(Candidature, on_delete=models.CASCADE, related_name="pieces")
    type_piece = models.CharField(max_length=30, choices=TypePieceCandidature.choices)
    fichier = models.FileField(upload_to=chemin_piece_jointe)
    empreinte_sha256 = models.CharField(max_length=64, editable=False, blank=True)
    statut_controle = models.CharField(
        max_length=20, choices=StatutControlePiece.choices, default=StatutControlePiece.EN_ATTENTE
    )

    class Meta:
        db_table = "pieces_jointes_candidature"
        ordering = ["-cree_le"]

    def save(self, *args, **kwargs):
        if self.fichier and not self.empreinte_sha256:
            hachage = hashlib.sha256()
            for bloc in self.fichier.chunks():
                hachage.update(bloc)
            self.empreinte_sha256 = hachage.hexdigest()
            self.fichier.seek(0)
        super().save(*args, **kwargs)


class ConvocationCandidature(ModeleHorodate):
    candidature = models.OneToOneField(
        Candidature, on_delete=models.CASCADE, related_name="convocation"
    )
    numero_convocation = models.CharField(max_length=40, unique=True, editable=False)
    charge_qr_jws = models.TextField(
        editable=False, help_text="Charge signée (JWS) encodée dans le QR."
    )
    lieu = models.CharField(max_length=200, blank=True)
    date_convocation = models.DateTimeField()

    class Meta:
        db_table = "convocations_candidature"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.numero_convocation

    @staticmethod
    def generer_numero(candidature: Candidature) -> str:
        return f"CV-{candidature.numero_suivi.removeprefix('CONC-')}"

    @staticmethod
    def date_convocation_par_defaut() -> datetime:
        return timezone.now() + timedelta(days=30)
