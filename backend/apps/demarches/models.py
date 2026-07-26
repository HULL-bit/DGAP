"""Espace démarches public — contact tracé et FAQ (§5, §7.2, Bloc B)."""

from __future__ import annotations

from django.db import models
from django.utils import timezone

from core.models import ModeleAvecSuppressionLogique, ModeleHorodate


def generer_numero_ticket() -> str:
    """Format `CTC-AAAA-XXXXXX` — compteur annuel, cf. `DGAP-VIS-AAAA-XXXXXX` (§5)."""
    annee = timezone.now().year
    prefixe = f"CTC-{annee}-"
    # django-stubs : accès à un manager générique via la classe, faux positif connu.
    compte = Contact.tous_les_objets.filter(numero_ticket__startswith=prefixe).count() + 1  # type: ignore[misc]
    return f"{prefixe}{compte:06d}"


class StatutContact(models.TextChoices):
    NOUVEAU = "NOUVEAU", "Nouveau"
    EN_TRAITEMENT = "EN_TRAITEMENT", "En traitement"
    TRAITE = "TRAITE", "Traité"


class Contact(ModeleAvecSuppressionLogique):
    """Formulaire de contact tracé — accusé automatique avec numéro de ticket (§7.2)."""

    numero_ticket = models.CharField(max_length=20, unique=True, editable=False)
    nom = models.CharField(max_length=150)
    email = models.EmailField()
    telephone = models.CharField(max_length=30, blank=True)
    sujet = models.CharField(max_length=200)
    message = models.TextField()
    statut = models.CharField(
        max_length=20, choices=StatutContact.choices, default=StatutContact.NOUVEAU
    )
    reponse = models.TextField(blank=True)

    class Meta:
        db_table = "contacts"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.numero_ticket} — {self.sujet}"

    def save(self, *args, **kwargs):
        if not self.numero_ticket:
            self.numero_ticket = generer_numero_ticket()
        super().save(*args, **kwargs)


class FAQ(ModeleHorodate):
    question = models.CharField(max_length=300)
    reponse = models.TextField()
    categorie = models.CharField(max_length=100, blank=True, db_index=True)
    ordre = models.PositiveIntegerField(default=0)
    publie = models.BooleanField(default=True)

    class Meta:
        db_table = "faq"
        verbose_name = "FAQ"
        verbose_name_plural = "FAQ"
        ordering = ["categorie", "ordre"]

    def __str__(self) -> str:  # pragma: no cover
        return self.question
