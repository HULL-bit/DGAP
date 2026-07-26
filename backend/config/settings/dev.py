from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = True

# Mailhog en développement (§10 — notifications).
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="localhost")
EMAIL_PORT = config("EMAIL_PORT", default=1025, cast=int)

CORS_ALLOW_ALL_ORIGINS = True

# django-axes se désactive difficilement en tests ; on relâche le seuil en dev.
AXES_FAILURE_LIMIT = 20
