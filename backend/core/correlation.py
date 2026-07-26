"""Identifiant de corrélation par requête — propagé dans les logs structurés et dans
les réponses d'erreur RFC 9457 (§6.1), pour relier un incident signalé par un usager
à la ligne de log correspondante sans exposer de détail interne.
"""

import uuid
from contextvars import ContextVar

_id_correlation: ContextVar[str] = ContextVar("id_correlation", default="")

EN_TETE_CORRELATION = "X-Correlation-Id"


def id_correlation_courant() -> str:
    return _id_correlation.get()


class MiddlewareCorrelation:
    """Lit X-Correlation-Id (fourni par le frontend/nginx) ou en génère un."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        identifiant = request.headers.get(EN_TETE_CORRELATION) or str(uuid.uuid4())
        jeton = _id_correlation.set(identifiant)
        try:
            reponse = self.get_response(request)
        finally:
            _id_correlation.reset(jeton)
        reponse[EN_TETE_CORRELATION] = identifiant
        return reponse
