"""Édition PDF (WeasyPrint) des attestations de travail (EF-703, EF-704) — document
administratif interne, sans dispositif de signature électronique (voir
`apps/courrier/models.py` pour la même réserve sur la GEC)."""

from __future__ import annotations

from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from .models import DemandeRH


def generer_pdf_attestation_travail(demande: DemandeRH) -> bytes:
    html = render_to_string(
        "rh/attestation_travail.html", {"demande": demande, "date_edition": timezone.now()}
    )
    return HTML(string=html).write_pdf()
