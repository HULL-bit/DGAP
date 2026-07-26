"""Paramètres communs. Ne jamais placer de secret réel ici — tout passe par .env (§15)."""

from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="change-moi-en-dev-uniquement")
DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "django_otp",
    "django_otp.plugins.otp_totp",
    "axes",
    "storages",
    # Socle
    "core",
    "apps.audit",
    "apps.comptes",
    # Bloc B — portail public (Phase 1)
    "apps.referentiels",
    "apps.etablissements",
    "apps.contenus",
    "apps.demarches",
    "apps.mediatheque",
    # Apps métier restantes — activées au fil des lots (§4.3). Volontairement absentes
    # tant que leurs modèles ne sont pas livrés : `apps.detenus` ne doit JAMAIS être
    # routée côté public (§6.3) et sera montée dans une configuration réseau cloisonnée.
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "axes.middleware.AxesMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.correlation.MiddlewareCorrelation",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Base de données -------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB", default="dgap"),
        "USER": config("POSTGRES_USER", default="dgap"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="dgap"),
        "HOST": config("POSTGRES_HOST", default="localhost"),
        "PORT": config("POSTGRES_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_USER_MODEL = "comptes.Utilisateur"

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# django-axes : verrouillage progressif (§6.3)
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = timedelta(minutes=15)
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Stockage objet (MinIO / S3) --------------------------------------------------
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "access_key": config("MINIO_ACCESS_KEY", default="dgap"),
            "secret_key": config("MINIO_SECRET_KEY", default="dgap-dev-secret"),
            "bucket_name": config("MINIO_BUCKET", default="dgap-medias"),
            "endpoint_url": config("MINIO_ENDPOINT_URL", default="http://localhost:9000"),
            "region_name": config("MINIO_REGION", default="us-east-1"),
            "default_acl": "private",
            "file_overwrite": False,
        },
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# --- REST framework / API ---------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.PaginationParCurseur",
    # Pas de DjangoFilterBackend global : le filtrage public (region/type/q…) est
    # implémenté à la main dans get_queryset() par vue, sans FilterSet dédié. Un
    # module qui a besoin de filtres déclaratifs peut ajouter son propre
    # filterset_class + filter_backends localement.
    "EXCEPTION_HANDLER": "core.exceptions.gestionnaire_exceptions_rfc9457",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "depot-demande": "20/min",
        "suivi-demande": "30/min",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API DGAP",
    "DESCRIPTION": "Direction Générale de l'Administration Pénitentiaire — Sénégal. API REST v1.",
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.1.0",  # §4.2 — OpenAPI 3.1 imposé par le cahier des charges.
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}

# --- CORS (aucun joker en prod, §9.3) ---------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# --- Celery -------------------------------------------------------------------
CELERY_BROKER_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE

# --- Logs structurés JSON avec correlation_id (§15) -------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "core.logging.FormateurJSON"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": config("LOG_LEVEL", default="INFO")},
}
