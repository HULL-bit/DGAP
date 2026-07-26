"""Générateur d'identifiants UUID v7 (RFC 9562) — PK triable par temps de création.

Utilisé comme clé primaire de toutes les tables métier (§5) : contrairement à UUID v4,
UUID v7 conserve un ordre proche de l'insertion, ce qui limite la fragmentation des
index B-tree PostgreSQL sur de gros volumes (courriers, journal d'audit, notifications).
"""

import os
import time
import uuid


def uuid7() -> uuid.UUID:
    unix_ms = int(time.time() * 1000)
    tete = unix_ms.to_bytes(6, "big")
    aleatoire = os.urandom(10)
    octets = bytearray(tete + aleatoire)

    # Version 7 sur les 4 bits hauts de l'octet 6.
    octets[6] = (octets[6] & 0x0F) | 0x70
    # Variant RFC 4122 sur les 2 bits hauts de l'octet 8.
    octets[8] = (octets[8] & 0x3F) | 0x80

    return uuid.UUID(bytes=bytes(octets))
