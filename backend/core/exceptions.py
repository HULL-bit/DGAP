"""Gestionnaire d'exceptions DRF au format RFC 9457 (Problem Details for HTTP APIs).

Toute erreur d'API renvoie {type, title, status, detail, correlation_id} — jamais de
trace Python, de nom de table ou de chemin de fichier (fuite d'info interne interdite).
"""

from __future__ import annotations

from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as gestionnaire_par_defaut

from core.correlation import id_correlation_courant

TYPE_ERREUR_BASE = "https://administrationpenitentiaire.sn/erreurs"

_TITRES_PAR_STATUT = {
    400: "Requête invalide",
    401: "Authentification requise",
    403: "Accès refusé",
    404: "Ressource introuvable",
    405: "Méthode non autorisée",
    409: "Conflit",
    422: "Entité non traitable",
    429: "Trop de requêtes",
    500: "Erreur interne",
}


class ErreurMetier(drf_exceptions.APIException):
    """Exception métier générique — lever avec un status_code et un detail explicites."""

    status_code = 422
    default_detail = "L'opération demandée n'a pas pu être réalisée."
    default_code = "erreur_metier"


def gestionnaire_exceptions_rfc9457(exc, context):
    if isinstance(exc, Http404):
        exc = drf_exceptions.NotFound()

    reponse = gestionnaire_par_defaut(exc, context)
    if reponse is None:
        return None

    detail = reponse.data
    if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
        detail_texte = str(detail["detail"])
    elif isinstance(detail, (list, dict)):
        detail_texte = None
    else:
        detail_texte = str(detail)

    code_erreur = getattr(exc, "default_code", "erreur")
    corps = {
        "type": f"{TYPE_ERREUR_BASE}/{code_erreur}",
        "title": _TITRES_PAR_STATUT.get(reponse.status_code, "Erreur"),
        "status": reponse.status_code,
        "correlation_id": id_correlation_courant(),
    }
    if detail_texte:
        corps["detail"] = detail_texte
    elif isinstance(detail, dict):
        corps["erreurs_champs"] = detail

    return Response(corps, status=reponse.status_code, content_type="application/problem+json")
