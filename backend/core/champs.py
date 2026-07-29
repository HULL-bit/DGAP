"""Champs de modèle personnalisés."""

from __future__ import annotations

from django.db import models

from .chiffrement import chiffrer, dechiffrer


class ChampChiffre(models.BinaryField):
    """Chaîne de caractères côté Python, chiffrée en AES-256-GCM au repos
    (`core.chiffrement`) — transparent pour le code appelant et les
    sérialiseurs DRF, jamais en clair en base."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("editable", True)
        super().__init__(*args, **kwargs)

    def from_db_value(self, value, expression, connection) -> str:
        if value is None:
            return ""
        return dechiffrer(bytes(value))

    def to_python(self, value):
        if isinstance(value, (bytes, memoryview)):
            return dechiffrer(bytes(value))
        return value or ""

    def get_prep_value(self, value) -> bytes | None:
        if value is None:
            return None
        return chiffrer(str(value))
