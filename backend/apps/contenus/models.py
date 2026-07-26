"""CMS éditorial (Bloc C) — workflow rédacteur→valideur→publié, versions, menus.

Le Bloc B n'exposait que la lecture publique (statut=PUBLIE). Ce module ajoute :
- les transitions de statut contrôlées (`ContenuEditorial.transitionner`) ;
- l'historique de versions (`VersionContenu`, snapshot générique via contenttypes) ;
- les menus de navigation gérés en back-office.
"""

from __future__ import annotations

from typing import Any

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone

from core.models import (
    ModeleAvecSuppressionLogique,
    ModeleBase,
    ModeleHorodate,
    RequeteAvecSuppressionLogiqueManager,
)


class StatutContenu(models.TextChoices):
    BROUILLON = "BROUILLON", "Brouillon"
    RELECTURE = "RELECTURE", "En relecture"
    VALIDE = "VALIDE", "Validé"
    PUBLIE = "PUBLIE", "Publié"
    ARCHIVE = "ARCHIVE", "Archivé"


# Transitions autorisées : statut de départ -> {action: statut d'arrivée}.
TRANSITIONS_AUTORISEES: dict[str, dict[str, str]] = {
    StatutContenu.BROUILLON: {"soumettre": StatutContenu.RELECTURE},
    StatutContenu.RELECTURE: {
        "valider": StatutContenu.VALIDE,
        "rejeter": StatutContenu.BROUILLON,
    },
    StatutContenu.VALIDE: {
        "publier": StatutContenu.PUBLIE,
        "rejeter": StatutContenu.BROUILLON,
    },
    StatutContenu.PUBLIE: {"archiver": StatutContenu.ARCHIVE},
    StatutContenu.ARCHIVE: {"reactiver": StatutContenu.BROUILLON},
}

# Action -> scope de permission requis (§6.3 RBAC — cf. apps.comptes).
SCOPE_PAR_ACTION: dict[str, str] = {
    "soumettre": "contenus:rediger",
    "valider": "contenus:valider",
    "rejeter": "contenus:valider",
    "publier": "contenus:publier",
    "archiver": "contenus:publier",
    "reactiver": "contenus:rediger",
}


class TransitionInvalide(Exception):
    def __init__(self, statut_actuel: str, action: str):
        self.statut_actuel = statut_actuel
        self.action = action
        super().__init__(f"Transition « {action} » impossible depuis le statut {statut_actuel}.")


class Rubrique(ModeleHorodate):
    code = models.SlugField(max_length=80, unique=True)
    titre = models.CharField(max_length=150)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="enfants"
    )
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "rubriques"
        ordering = ["ordre", "titre"]

    def __str__(self) -> str:  # pragma: no cover
        return self.titre


class RequeteContenuPublieManager(RequeteAvecSuppressionLogiqueManager):
    def publies(self) -> models.QuerySet:
        return self.get_queryset().filter(statut=StatutContenu.PUBLIE)


class ContenuEditorial(ModeleAvecSuppressionLogique):
    """Socle commun Article/Page : statut, transitions, versionnement (Bloc C)."""

    #: Champs capturés dans chaque instantané de version (redéfini par sous-classe).
    champs_versionnes: tuple[str, ...] = ()

    statut = models.CharField(
        max_length=20, choices=StatutContenu.choices, default=StatutContenu.BROUILLON
    )

    objets = RequeteContenuPublieManager()

    class Meta(ModeleAvecSuppressionLogique.Meta):
        abstract = True

    def transitionner(self, action: str, acteur=None, commentaire: str = "") -> None:
        """Applique une transition de workflow si elle est autorisée depuis le statut courant."""
        transitions = TRANSITIONS_AUTORISEES.get(self.statut, {})
        nouveau_statut = transitions.get(action)
        if nouveau_statut is None:
            raise TransitionInvalide(self.statut, action)

        self.statut = nouveau_statut
        if acteur is not None:
            self.modifie_par = acteur
        self.save()
        self.creer_version(acteur=acteur, commentaire=commentaire or f"Action : {action}")

    def instantane(self) -> dict[str, Any]:
        def _serialiser(valeur: Any) -> Any:
            if hasattr(valeur, "isoformat"):
                return valeur.isoformat()
            return valeur

        return {champ: _serialiser(getattr(self, champ)) for champ in self.champs_versionnes}

    def creer_version(self, acteur=None, commentaire: str = "") -> VersionContenu:
        dernier_numero = (
            VersionContenu.objects.filter(
                content_type=ContentType.objects.get_for_model(self), object_id=self.pk
            )
            .order_by("-numero")
            .values_list("numero", flat=True)
            .first()
            or 0
        )
        return VersionContenu.objects.create(
            content_type=ContentType.objects.get_for_model(self),
            object_id=self.pk,
            numero=dernier_numero + 1,
            instantane=self.instantane(),
            auteur=acteur if getattr(acteur, "is_authenticated", False) else None,
            commentaire=commentaire,
        )

    def restaurer(self, version: VersionContenu, acteur=None) -> None:
        for champ, valeur in version.instantane.items():
            if champ in self.champs_versionnes:
                setattr(self, champ, valeur)
        if acteur is not None:
            self.modifie_par = acteur
        self.save()
        self.creer_version(
            acteur=acteur, commentaire=f"Restauration de la version {version.numero}"
        )

    def versions(self) -> models.QuerySet:
        return VersionContenu.objects.filter(
            content_type=ContentType.objects.get_for_model(self), object_id=self.pk
        )


class Article(ContenuEditorial):
    titre = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    chapo = models.TextField(blank=True, help_text="Résumé affiché dans les listes.")
    contenu = models.TextField(blank=True)
    rubrique = models.ForeignKey(
        Rubrique, on_delete=models.SET_NULL, null=True, blank=True, related_name="articles"
    )
    date_publication = models.DateTimeField(null=True, blank=True)
    image_url = models.URLField(
        blank=True, help_text="Placeholder — médiathèque MinIO au Bloc B/C."
    )
    meta_titre = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)

    champs_versionnes = ("titre", "chapo", "contenu", "meta_titre", "meta_description", "image_url")

    class Meta:
        db_table = "articles"
        ordering = ["-date_publication", "-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.titre

    def transitionner(self, action: str, acteur=None, commentaire: str = "") -> None:
        if action == "publier" and not self.date_publication:
            self.date_publication = timezone.now()
        super().transitionner(action, acteur=acteur, commentaire=commentaire)

    def publier(self) -> None:
        """Raccourci direct (seed/scripts) — préférer `transitionner` en back-office."""
        self.statut = StatutContenu.PUBLIE
        self.date_publication = self.date_publication or timezone.now()
        self.save(update_fields=["statut", "date_publication", "modifie_le"])


class Page(ContenuEditorial):
    titre = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    contenu = models.TextField(blank=True)
    rubrique = models.ForeignKey(
        Rubrique, on_delete=models.SET_NULL, null=True, blank=True, related_name="pages"
    )
    meta_titre = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)

    champs_versionnes = ("titre", "contenu", "meta_titre", "meta_description")

    class Meta:
        db_table = "pages"
        ordering = ["titre"]

    def __str__(self) -> str:  # pragma: no cover
        return self.titre


class VersionContenu(ModeleBase):
    """Instantané d'un `Article`/`Page` à un instant donné — jamais modifié après coup."""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    contenu_source = GenericForeignKey("content_type", "object_id")

    numero = models.PositiveIntegerField()
    instantane = models.JSONField(default=dict)
    auteur = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    commentaire = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "versions_contenu"
        ordering = ["-numero"]
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id", "numero"], name="uniq_version_par_contenu"
            )
        ]
        indexes = [models.Index(fields=["content_type", "object_id"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"Version {self.numero} — {self.contenu_source}"

    def save(self, *args, **kwargs):  # pragma: no cover - garde-fou append-only
        if self.pk and VersionContenu.objects.filter(pk=self.pk).exists():
            raise NotImplementedError(
                "Une version est un instantané figé : aucune modification autorisée."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # pragma: no cover - garde-fou
        raise NotImplementedError(
            "L'historique de versions est append-only : aucune suppression autorisée."
        )


class Menu(ModeleHorodate):
    code = models.SlugField(max_length=60, unique=True)
    libelle = models.CharField(max_length=150)

    class Meta:
        db_table = "menus"
        ordering = ["libelle"]

    def __str__(self) -> str:  # pragma: no cover
        return self.libelle


class ElementMenu(ModeleHorodate):
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name="elements")
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="enfants"
    )
    libelle = models.CharField(max_length=150)
    url = models.CharField(
        max_length=300, blank=True, help_text="URL directe, si non lié à une page."
    )
    page = models.ForeignKey(
        Page, on_delete=models.SET_NULL, null=True, blank=True, related_name="elements_menu"
    )
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "elements_menu"
        ordering = ["ordre"]

    def __str__(self) -> str:  # pragma: no cover
        return self.libelle
