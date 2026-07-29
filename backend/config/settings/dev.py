from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = True

# Mailhog en développement (§10 — notifications).
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="localhost")
EMAIL_PORT = config("EMAIL_PORT", default=1025, cast=int)

CORS_ALLOW_ALL_ORIGINS = True

# storage.localhost (nginx → MinIO, voir docker-compose.yml/nginx/conf.d/storage.conf)
# sert un certificat auto-signé (make certs) : boto3 ne le valide pas nativement.
# Dev uniquement — config.settings.prod ne charge jamais ce module.
STORAGES["default"]["OPTIONS"]["verify"] = False  # type: ignore[index]  # noqa: F405

# django-axes se désactive difficilement en tests ; on relâche le seuil en dev.
AXES_FAILURE_LIMIT = 20
