"""Chiffrement applicatif AES-256-GCM (§9.3) — identité des personnes détenues
(`apps.detenus`) et tout futur champ nominatif nécessitant un chiffrement au repos
au-delà du chiffrement de la base elle-même. Nonce aléatoire par valeur, préfixé
au texte chiffré : pas de table de nonces séparée à maintenir.
"""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings

TAILLE_NONCE = 12  # 96 bits — taille recommandée pour AES-GCM


def _cle() -> bytes:
    return base64.b64decode(settings.CLE_CHIFFREMENT_DONNEES)


def chiffrer(valeur: str) -> bytes:
    if not valeur:
        return b""
    aesgcm = AESGCM(_cle())
    nonce = os.urandom(TAILLE_NONCE)
    return nonce + aesgcm.encrypt(nonce, valeur.encode("utf-8"), None)


def dechiffrer(valeur: bytes) -> str:
    if not valeur:
        return ""
    aesgcm = AESGCM(_cle())
    nonce, chiffre = valeur[:TAILLE_NONCE], valeur[TAILLE_NONCE:]
    return aesgcm.decrypt(nonce, chiffre, None).decode("utf-8")
