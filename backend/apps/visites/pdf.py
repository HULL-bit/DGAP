"""Génération du permis de visite — PDF (WeasyPrint) + QR signé (JWS, §10)."""

from __future__ import annotations

import base64
from io import BytesIO

import qrcode
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from core.qr_signe import signer_charge

from .models import DemandeVisite, PermisVisite


def creer_ou_recuperer_permis(demande: DemandeVisite) -> PermisVisite:
    """Émet le permis (idempotent) une fois la demande validée/permis délivré."""
    permis, cree = PermisVisite.objects.get_or_create(
        demande=demande,
        defaults={
            "numero_permis": PermisVisite.generer_numero(demande),
            "valide_jusqu_au": PermisVisite.duree_validite_par_defaut(),
        },
    )
    if cree:
        charge = {
            "numero_permis": permis.numero_permis,
            "demande": demande.numero_suivi,
            "etablissement": demande.etablissement.code,
            "valide_jusqu_au": permis.valide_jusqu_au.isoformat(),
            "emis_le": timezone.now().isoformat(),
        }
        permis.charge_qr_jws = signer_charge(charge)
        permis.save(update_fields=["charge_qr_jws"])
    return permis


def _qr_base64(contenu: str) -> str:
    image = qrcode.make(contenu)
    tampon = BytesIO()
    image.save(tampon, format="PNG")
    return base64.b64encode(tampon.getvalue()).decode()


def generer_pdf_permis(demande: DemandeVisite) -> bytes:
    permis = creer_ou_recuperer_permis(demande)
    html = render_to_string(
        "visites/permis.html",
        {"demande": demande, "permis": permis, "qr_base64": _qr_base64(permis.charge_qr_jws)},
    )
    return HTML(string=html).write_pdf()
