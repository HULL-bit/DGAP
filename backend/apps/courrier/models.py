"""Gestion électronique du courrier — GEC (M5), Bloc G, jamais exposé côté public.

Portée de cette première passe (EF-501 à EF-504, EF-506, EF-507 — cœur
« Obligatoire ») : enregistrement du courrier entrant avec numérotation
chronologique, affectation tracée, projets de réponse avec circuit de visa,
courrier sortant, recherche multicritère, confidentialité avec restriction
d'accès et journalisation (`apps.audit`).

Non couvert (dépendances non livrées ou hors périmètre produit) :
- OCR d'aide au classement (EF-501) et versement automatique en GED (EF-508) —
  `apps.ged` (M6) n'est pas construite.
- Relances et escalades automatiques (EF-505) — suppose une tâche planifiée
  (Celery beat, déjà dans la stack) ; non construit dans cette passe.
- Signature électronique du signataire (EF-503) — une signature électronique
  *qualifiée* est explicitement un « perspective » du Lot 5 du cahier des
  charges (hors périmètre contractuel ferme) ; ici, `signataire`/`date_signature`
  tracent qui a validé, sans dispositif cryptographique de signature.
- Chiffrement renforcé au niveau champ pour les niveaux élevés (EF-507) — la
  restriction d'accès et la journalisation sont couvertes, pas le chiffrement au
  repos (choix de bibliothèque et gestion de clés à trancher séparément).
- Export PDF/Excel des registres (EF-506) — la recherche multicritère est
  couverte, pas l'export.
"""

from __future__ import annotations

from django.db import models
from django.utils import timezone

from core.models import ModeleAvecSuppressionLogique, ModeleBase


class NiveauConfidentialite(models.TextChoices):
    NORMAL = "NORMAL", "Normal"
    CONFIDENTIEL = "CONFIDENTIEL", "Confidentiel"
    SECRET = "SECRET", "Secret"


class StatutCourrierEntrant(models.TextChoices):
    ENREGISTRE = "ENREGISTRE", "Enregistré"
    AFFECTE = "AFFECTE", "Affecté"
    EN_TRAITEMENT = "EN_TRAITEMENT", "En traitement"
    TRAITE = "TRAITE", "Traité"
    CLOS = "CLOS", "Clos"


# Transitions autorisées : statut de départ -> {action: statut d'arrivée}. Même
# principe que `apps.visites.models.TRANSITIONS_AUTORISEES`.
TRANSITIONS_AUTORISEES: dict[str, dict[str, str]] = {
    StatutCourrierEntrant.ENREGISTRE: {"affecter": StatutCourrierEntrant.AFFECTE},
    StatutCourrierEntrant.AFFECTE: {
        "prendre_en_charge": StatutCourrierEntrant.EN_TRAITEMENT,
        "reaffecter": StatutCourrierEntrant.AFFECTE,
    },
    StatutCourrierEntrant.EN_TRAITEMENT: {
        "traiter": StatutCourrierEntrant.TRAITE,
        "reaffecter": StatutCourrierEntrant.AFFECTE,
    },
    StatutCourrierEntrant.TRAITE: {"cloturer": StatutCourrierEntrant.CLOS},
}

SCOPE_PAR_ACTION: dict[str, str] = {
    "affecter": "courrier:gerer",
    "prendre_en_charge": "courrier:gerer",
    "reaffecter": "courrier:gerer",
    "traiter": "courrier:gerer",
    "cloturer": "courrier:gerer",
}


class TransitionInvalide(Exception):
    def __init__(self, statut_actuel: str, action: str):
        self.statut_actuel = statut_actuel
        self.action = action
        super().__init__(f"Transition « {action} » impossible depuis le statut {statut_actuel}.")


def generer_numero_entrant() -> str:
    """Format `COUR-E-AAAA-XXXXXX` (§5, même convention que `DGAP-VIS-AAAA-XXXXXX`)."""
    annee = timezone.now().year
    prefixe = f"COUR-E-{annee}-"
    compte = CourrierEntrant.tous_les_objets.filter(numero__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:06d}"


def chemin_courrier_entrant(instance: CourrierEntrant, nom_fichier: str) -> str:
    return f"courrier/entrant/{instance.id}/{nom_fichier}"


class CourrierEntrant(ModeleAvecSuppressionLogique):
    numero = models.CharField(max_length=30, unique=True, editable=False)
    expediteur = models.CharField(max_length=200)
    objet = models.CharField(max_length=300)
    date_reception = models.DateField(default=timezone.now)
    confidentialite = models.CharField(
        max_length=15, choices=NiveauConfidentialite.choices, default=NiveauConfidentialite.NORMAL
    )
    #: Fichier réel (MinIO) — même patron que `Article.image` : l'URL exposée par
    #: l'API est presignée à la lecture, jamais stockée telle quelle.
    fichier = models.FileField(upload_to=chemin_courrier_entrant, blank=True)
    statut = models.CharField(
        max_length=20,
        choices=StatutCourrierEntrant.choices,
        default=StatutCourrierEntrant.ENREGISTRE,
    )
    perimetre_affecte = models.ForeignKey(
        "comptes.Perimetre",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courriers_entrants",
    )
    agent_affecte = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    delai_reponse = models.DateField(null=True, blank=True)
    instructions = models.TextField(blank=True)

    class Meta:
        db_table = "courriers_entrants"
        ordering = ["-cree_le"]
        verbose_name = "Courrier entrant"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.numero} — {self.objet}"

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = generer_numero_entrant()
        super().save(*args, **kwargs)

    @property
    def est_en_retard(self) -> bool:
        return bool(
            self.delai_reponse
            and self.delai_reponse < timezone.now().date()
            and self.statut not in (StatutCourrierEntrant.TRAITE, StatutCourrierEntrant.CLOS)
        )

    def transitionner(
        self,
        action: str,
        acteur=None,
        perimetre=None,
        agent=None,
        instructions: str = "",
    ) -> None:
        transitions = TRANSITIONS_AUTORISEES.get(self.statut, {})
        nouveau_statut = transitions.get(action)
        if nouveau_statut is None:
            raise TransitionInvalide(self.statut, action)

        self.statut = nouveau_statut
        if action in ("affecter", "reaffecter"):
            self.perimetre_affecte = perimetre
            self.agent_affecte = agent
            self.instructions = instructions
            AffectationCourrier.objects.create(
                courrier=self,
                perimetre=perimetre,
                agent=agent,
                instructions=instructions,
                cree_par=acteur,
            )
        if acteur is not None:
            self.modifie_par = acteur
        self.save()


class AffectationCourrier(ModeleBase):
    """Historique tracé des (ré)affectations (EF-502) — `cree_par` (hérité de
    `ModeleBase`) porte l'auteur de l'affectation, jamais modifié après coup."""

    courrier = models.ForeignKey(
        CourrierEntrant, on_delete=models.CASCADE, related_name="affectations"
    )
    perimetre = models.ForeignKey(
        "comptes.Perimetre", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    agent = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    instructions = models.TextField(blank=True)

    class Meta:
        db_table = "affectations_courrier"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.courrier.numero} → {self.agent or self.perimetre}"


class StatutReponse(models.TextChoices):
    BROUILLON = "BROUILLON", "Brouillon"
    VISE = "VISE", "Visé"
    VALIDE = "VALIDE", "Validé"
    EXPEDIE = "EXPEDIE", "Expédié"


TRANSITIONS_AUTORISEES_REPONSE: dict[str, dict[str, str]] = {
    StatutReponse.BROUILLON: {"viser": StatutReponse.VISE},
    StatutReponse.VISE: {"valider": StatutReponse.VALIDE, "rejeter": StatutReponse.BROUILLON},
    StatutReponse.VALIDE: {"expedier": StatutReponse.EXPEDIE},
}

SCOPE_PAR_ACTION_REPONSE: dict[str, str] = {
    "viser": "courrier:viser",
    "valider": "courrier:valider",
    "rejeter": "courrier:viser",
    "expedier": "courrier:gerer",
}


class ReponseCourrier(ModeleBase):
    """Projet de réponse (EF-503) — `signataire`/`date_signature` tracent la
    validation par le signataire habilité, sans dispositif cryptographique de
    signature électronique (voir docstring du module)."""

    courrier = models.ForeignKey(CourrierEntrant, on_delete=models.CASCADE, related_name="reponses")
    contenu = models.TextField()
    statut = models.CharField(
        max_length=15, choices=StatutReponse.choices, default=StatutReponse.BROUILLON
    )
    signataire = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    date_signature = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reponses_courrier"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Réponse à {self.courrier.numero} ({self.statut})"

    def transitionner(self, action: str, acteur=None) -> None:
        transitions = TRANSITIONS_AUTORISEES_REPONSE.get(self.statut, {})
        nouveau_statut = transitions.get(action)
        if nouveau_statut is None:
            raise TransitionInvalide(self.statut, action)

        self.statut = nouveau_statut
        if action == "valider":
            self.signataire = acteur
            self.date_signature = timezone.now()
        if acteur is not None:
            self.modifie_par = acteur
        self.save()


class StatutCourrierSortant(models.TextChoices):
    ENREGISTRE = "ENREGISTRE", "Enregistré"
    EXPEDIE = "EXPEDIE", "Expédié"
    ACCUSE_RECU = "ACCUSE_RECU", "Accusé de réception reçu"


def generer_numero_sortant() -> str:
    annee = timezone.now().year
    prefixe = f"COUR-S-{annee}-"
    compte = CourrierSortant.tous_les_objets.filter(numero__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:06d}"


def chemin_courrier_sortant(instance: CourrierSortant, nom_fichier: str) -> str:
    return f"courrier/sortant/{instance.id}/{nom_fichier}"


class CourrierSortant(ModeleAvecSuppressionLogique):
    numero = models.CharField(max_length=30, unique=True, editable=False)
    destinataire = models.CharField(max_length=200)
    objet = models.CharField(max_length=300)
    date_envoi = models.DateField(null=True, blank=True)
    fichier = models.FileField(upload_to=chemin_courrier_sortant, blank=True)
    statut = models.CharField(
        max_length=15,
        choices=StatutCourrierSortant.choices,
        default=StatutCourrierSortant.ENREGISTRE,
    )
    reponse_source = models.ForeignKey(
        ReponseCourrier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courriers_sortants",
    )
    perimetre = models.ForeignKey(
        "comptes.Perimetre", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        db_table = "courriers_sortants"
        ordering = ["-cree_le"]
        verbose_name = "Courrier sortant"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.numero} — {self.objet}"

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = generer_numero_sortant()
        super().save(*args, **kwargs)


def courriers_entrants_visibles_par(utilisateur) -> models.QuerySet[CourrierEntrant]:
    """Restriction d'accès par confidentialité (EF-507) : un agent ne voit les
    courriers confidentiels/secrets que s'il porte le scope `courrier:confidentiel`
    (ou `est_superviseur_national`) — sinon ils sont exclus jusqu'au niveau de la
    liste, pas seulement du détail (l'existence même d'un courrier secret ne doit
    pas fuiter dans une liste)."""

    qs = CourrierEntrant.objets.all()
    if utilisateur.est_superviseur_national or "courrier:confidentiel" in utilisateur.scopes():
        return qs
    return qs.filter(confidentialite=NiveauConfidentialite.NORMAL)
