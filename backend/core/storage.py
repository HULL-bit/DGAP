"""Stockage objet (MinIO/S3) dont les URLs générées sont relatives (sans schéma
ni hôte) plutôt que pointer sur un domaine séparé (`storage.localhost` en dev).

Chaque zone nginx proxie `/dgap-medias/` vers MinIO en interne (voir
`nginx/conf.d/*.conf`), en forçant `Host: storage.localhost` vers l'amont
(c'est ce nom d'hôte que le backend a utilisé pour signer l'URL — SigV4 exige
une correspondance stricte, voir `nginx/conf.d/storage.conf`) — mais le
navigateur, lui, charge toujours l'image depuis l'origine déjà visitée. Ceci
évite un problème de confiance TLS cross-origine en développement (certificat
auto-signé distinct pour `storage.localhost`, jamais accepté par le navigateur
tant que l'utilisateur ne l'a pas visité directement au moins une fois) — et
reste valable en production si `storage.<domaine>` utilise un certificat
différent de celui des applications.
"""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

from storages.backends.s3 import S3Storage


class StockageMedia(S3Storage):
    def url(self, name, parameters=None, expire=None, http_method=None) -> str:
        url_absolue = super().url(
            name, parameters=parameters, expire=expire, http_method=http_method
        )
        parties = urlsplit(url_absolue)
        return urlunsplit(("", "", parties.path, parties.query, ""))
