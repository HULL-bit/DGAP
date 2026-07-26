"""Journal d'audit — append-only, inaltérable, conservé >= 12 mois (§6.3, §9.3).

NOTE D'EXPLOITATION : la table est créée ici comme table PostgreSQL standard. Le
partitionnement par mois (RANGE sur `horodatage`) prévu au §5 est à appliquer via une
migration d'exploitation dédiée une fois les volumes réels connus (voir
docs/exploitation.md) — Django n'exprime pas le partitionnement déclaratif nativement ;
il se pose en SQL brut (CREATE TABLE ... PARTITION BY RANGE) au-dessus de ce modèle.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from core.id import uuid7


class Action(models.TextChoices):
    CONSULTER = "CONSULTER", "Consulter"
    CREER = "CREER", "Créer"
    MODIFIER = "MODIFIER", "Modifier"
    VALIDER = "VALIDER", "Valider"
    REJETER = "REJETER", "Rejeter"
    EXPORTER = "EXPORTER", "Exporter"
    ACCES_REFUSE = "ACCES_REFUSE", "Accès refusé"


class RequeteJournalAppendOnly(models.QuerySet):
    def update(self, *args, **kwargs):  # pragma: no cover - garde-fou
        raise NotImplementedError(
            "Le journal d'audit est append-only : aucune modification autorisée."
        )

    def delete(self, *args, **kwargs):  # pragma: no cover - garde-fou
        raise NotImplementedError(
            "Le journal d'audit est append-only : aucune suppression autorisée."
        )


GestionnaireJournalAppendOnly = models.Manager.from_queryset(RequeteJournalAppendOnly)


class JournalAction(models.Model):
    """Une ligne = une action tracée. Écriture uniquement via `JournalAction.tracer(...)`."""

    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    acteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    ressource_type = models.CharField(max_length=100)
    ressource_id = models.CharField(max_length=64, blank=True)
    horodatage = models.DateTimeField(auto_now_add=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    agent_utilisateur = models.TextField(blank=True)
    correlation_id = models.CharField(max_length=64, blank=True)
    detail = models.JSONField(default=dict, blank=True)

    objets = GestionnaireJournalAppendOnly()

    class Meta:
        db_table = "journal_actions"
        ordering = ["-horodatage"]
        indexes = [
            models.Index(fields=["ressource_type", "ressource_id"]),
            models.Index(fields=["acteur", "horodatage"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        horodatage = self.horodatage.strftime("%Y-%m-%d %H:%M")
        return f"{self.action} · {self.ressource_type}#{self.ressource_id} · {horodatage}"

    def save(self, *args, **kwargs):
        if self.pk and JournalAction.objets.filter(pk=self.pk).exists():
            raise NotImplementedError(
                "Le journal d'audit est append-only : aucune modification autorisée."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # pragma: no cover - garde-fou
        raise NotImplementedError(
            "Le journal d'audit est append-only : aucune suppression autorisée."
        )

    @classmethod
    def tracer(
        cls,
        *,
        acteur,
        action: str,
        ressource_type: str,
        ressource_id: str = "",
        requete=None,
        detail: dict | None = None,
    ) -> JournalAction:
        from core.correlation import id_correlation_courant

        return cls.objets.create(
            acteur=acteur if getattr(acteur, "is_authenticated", False) else None,
            action=action,
            ressource_type=ressource_type,
            ressource_id=str(ressource_id),
            adresse_ip=requete.META.get("REMOTE_ADDR") if requete else None,
            agent_utilisateur=requete.META.get("HTTP_USER_AGENT", "") if requete else "",
            correlation_id=id_correlation_courant(),
            detail=detail or {},
        )
