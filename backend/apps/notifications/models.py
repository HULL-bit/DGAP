"""Notifications SMS/e-mail (M14, EF-1405) — journal des envois déclenchés par les
changements d'état des téléservices déjà en production (EF-302, Visites et Concours).

Le canal SMS est **simulé** : aucun connecteur opérateur réel (agrégateur national
sénégalais ou opérateur direct) n'est engagé — même principe que le paiement mock
d'`apps.paiements` (décision produit, pas de service tiers non validé, §4.2). Le
canal e-mail est fonctionnel (SMTP réel — MailHog en dev).
"""

from __future__ import annotations

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from core.models import ModeleHorodate


class CanalNotification(models.TextChoices):
    EMAIL = "EMAIL", "E-mail"
    SMS = "SMS", "SMS"


class StatutNotification(models.TextChoices):
    ENVOYE = "ENVOYE", "Envoyé"
    ECHEC = "ECHEC", "Échec"


class Notification(ModeleHorodate):
    canal = models.CharField(max_length=10, choices=CanalNotification.choices)
    destinataire = models.CharField(max_length=200)
    sujet = models.CharField(max_length=200, blank=True)
    contenu = models.TextField()
    statut = models.CharField(max_length=10, choices=StatutNotification.choices)

    #: Objet à l'origine de l'envoi (`DemandeVisite`, `Candidature`…) — relation
    #: générique, même patron que `apps.paiements.Paiement`.
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    object_id = models.UUIDField(null=True, blank=True)
    objet_source = GenericForeignKey("content_type", "object_id")

    class Meta:
        db_table = "notifications"
        ordering = ["-cree_le"]
        indexes = [models.Index(fields=["content_type", "object_id"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.canal} → {self.destinataire} ({self.statut})"
