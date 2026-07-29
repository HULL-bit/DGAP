from decouple import config
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

DEBUG = False

# `config.settings.base` fournit des valeurs de repli pour tourner sans .env en dev
# (§0, confort local). Ces mêmes replis, restés actifs en production, videraient de
# leur sens les contrôles qu'ils protègent : une `SECRET_KEY` connue casse la
# signature des sessions/JWT/CSRF, une `CLE_CHIFFREMENT_DONNEES` connue annule le
# chiffrement de l'identité des personnes détenues (§9.3, apps.detenus) puisque la
# valeur figure en clair dans l'historique Git. On échoue donc au démarrage plutôt
# que de tourner silencieusement avec un secret public.
_SECRETS_A_VERIFIER = {
    "SECRET_KEY": "change-moi-en-dev-uniquement",
    "CLE_CHIFFREMENT_DONNEES": "c2VjcmV0LWRldi11bmlxdWVtZW50LTMyLW9jdGV0cyE=",
}
for _nom_secret, _valeur_dev in _SECRETS_A_VERIFIER.items():
    if globals().get(_nom_secret) == _valeur_dev:
        raise ImproperlyConfigured(
            f"{_nom_secret} est resté à sa valeur de développement — à définir "
            "explicitement en production (variable d'environnement, §9.3)."
        )
if DATABASES["default"]["PASSWORD"] == "dgap":  # noqa: F405
    raise ImproperlyConfigured(
        "POSTGRES_PASSWORD est resté à sa valeur de développement — à définir "
        "explicitement en production."
    )
if STORAGES["default"]["OPTIONS"]["secret_key"] == "dgap-dev-secret":  # type: ignore[index]  # noqa: F405
    raise ImproperlyConfigured(
        "MINIO_SECRET_KEY est resté à sa valeur de développement — à définir "
        "explicitement en production."
    )

# Nginx assure la terminaison TLS (§9.3) ; on fait confiance à son en-tête forwarded.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Strict"
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST")
EMAIL_PORT = config("EMAIL_PORT", cast=int, default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")

# `sentry-sdk` est une dépendance du projet depuis l'origine mais n'était encore
# initialisé nulle part — aucune erreur de production ne remontait ailleurs que
# dans les logs du conteneur. Optionnel (no-op sans DSN) : ne bloque pas le
# démarrage si absent, contrairement aux secrets ci-dessus. `send_default_pii`
# explicitement à `False` — ce système journalise l'identité de personnes
# détenues (§9.3, apps.detenus) et de courriers confidentiels, jamais à envoyer
# à un tiers de supervision par défaut.
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        environment=config("SENTRY_ENVIRONMENT", default="production"),
        traces_sample_rate=config("SENTRY_TRACES_SAMPLE_RATE", cast=float, default=0.1),
        send_default_pii=False,
    )
