"""Génération de la convocation — PDF (WeasyPrint) + QR signé (JWS, §10)."""

from __future__ import annotations

import base64
from io import BytesIO

import qrcode
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from core.qr_signe import signer_charge

from .models import Candidature, ConvocationCandidature


def creer_ou_recuperer_convocation(
    candidature: Candidature, lieu: str = "", date_convocation=None
) -> ConvocationCandidature:
    """Émet la convocation (idempotent) une fois la candidature convoquée."""
    convocation, cree = ConvocationCandidature.objects.get_or_create(
        candidature=candidature,
        defaults={
            "numero_convocation": ConvocationCandidature.generer_numero(candidature),
            "lieu": lieu,
            "date_convocation": date_convocation
            or ConvocationCandidature.date_convocation_par_defaut(),
        },
    )
    if cree:
        charge = {
            "numero_convocation": convocation.numero_convocation,
            "candidature": candidature.numero_suivi,
            "concours": candidature.concours.code,
            "date_convocation": convocation.date_convocation.isoformat(),
            "emis_le": timezone.now().isoformat(),
        }
        convocation.charge_qr_jws = signer_charge(charge)
        convocation.save(update_fields=["charge_qr_jws"])
    return convocation


def _qr_base64(contenu: str) -> str:
    image = qrcode.make(contenu)
    tampon = BytesIO()
    image.save(tampon, format="PNG")
    return base64.b64encode(tampon.getvalue()).decode()


def generer_pdf_convocation(candidature: Candidature) -> bytes:
    convocation = creer_ou_recuperer_convocation(candidature)
    html = render_to_string(
        "concours/convocation.html",
        {
            "candidature": candidature,
            "convocation": convocation,
            "qr_base64": _qr_base64(convocation.charge_qr_jws),
        },
    )
    return HTML(string=html).write_pdf()
