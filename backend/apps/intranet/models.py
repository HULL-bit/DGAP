"""Portail agents (Bloc F, M7) — tableau de bord personnel (EF-701) et notes de
service (EF-702). Les autres exigences du module (demandes administratives EF-703,
dossier agent EF-704, formation EF-705, annuaire EF-706, calendrier EF-707,
messagerie de service EF-708) dépendent de blocs non encore livrés (RH, GEC) et ne
sont volontairement pas anticipées ici.
"""

from __future__ import annotations

from django.db import models

from core.models import ModeleBase, ModeleHorodate


class NoteDeService(ModeleBase):
    """Diffusion ciblée (EF-702) : national, une direction ou un établissement.

    Le ciblage par « corps » mentionné au cahier des charges suppose une
    classification RH (`apps.rh`, non livrée) — non couvert par cette première
    passe, qui se limite au ciblage organisationnel déjà porté par `Perimetre`.
    """

    titre = models.CharField(max_length=250)
    contenu = models.TextField()
    perimetre_cible = models.ForeignKey(
        "comptes.Perimetre",
        on_delete=models.PROTECT,
        related_name="notes_de_service",
        help_text="Diffusion : périmètre national pour toute la DGAP, sinon une "
        "direction ou un établissement précis.",
    )
    accuse_lecture_requis = models.BooleanField(default=False)
    publie = models.BooleanField(default=True)

    class Meta:
        db_table = "notes_de_service"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.titre


class AccuseLectureNote(ModeleHorodate):
    """Accusé de lecture (EF-702) — `cree_le` fait office de date de lecture."""

    note = models.ForeignKey(
        NoteDeService, on_delete=models.CASCADE, related_name="accuses_lecture"
    )
    utilisateur = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.CASCADE, related_name="accuses_lecture_notes"
    )

    class Meta:
        db_table = "accuses_lecture_notes"
        ordering = ["-cree_le"]
        constraints = [
            models.UniqueConstraint(fields=["note", "utilisateur"], name="uniq_accuse_lecture_note")
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.utilisateur} — {self.note}"


def notes_visibles_par(utilisateur) -> models.QuerySet[NoteDeService]:
    """Notes publiées et pertinentes pour cet agent (§6.3 — ciblage par périmètre).

    Une note nationale est visible par tout agent interne, indépendamment de ses
    propres affectations ; les autres notes exigent que le périmètre ciblé figure
    parmi les périmètres autorisés de l'agent (ou `est_superviseur_national`).
    """

    qs = NoteDeService.objects.filter(publie=True)
    if utilisateur.est_superviseur_national:
        return qs
    perimetres_visibles = utilisateur.perimetres_autorises() | {"national"}
    return qs.filter(perimetre_cible__code__in=perimetres_visibles)
