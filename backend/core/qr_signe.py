"""Signature JWS des charges utiles QR (permis de visite, convocations — §10).

Le QR encode un jeton JWS compact (HS256) : vérifiable **hors-ligne** par quiconque
détient la clé (agents de contrôle à l'entrée d'un établissement, sans connexion
réseau), et re-vérifiable en ligne par numéro via l'API. Clé dédiée
(`QR_SIGNING_KEY`), distincte de `SECRET_KEY` Django pour limiter la portée d'une
éventuelle fuite.
"""

from __future__ import annotations

from typing import Any

import jwt
from django.conf import settings


def _cle_signature() -> str:
    return getattr(settings, "QR_SIGNING_KEY", None) or settings.SECRET_KEY


def signer_charge(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, _cle_signature(), algorithm="HS256")


def verifier_charge(jeton: str) -> dict[str, Any] | None:
    """Retourne la charge utile si la signature et l'expiration sont valides, sinon `None`."""
    try:
        return jwt.decode(jeton, _cle_signature(), algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
