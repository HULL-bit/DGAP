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
    "rest_framework_simplejwt.token_blacklist",
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
    # Bloc D — téléservice Visites (Phase 3)
    "apps.visites",
    # Bloc E — téléservice Concours (Phase 4)
    "apps.paiements",
    "apps.concours",
    # Vitrine des produits des ateliers de réinsertion (catalogue de présentation
    # uniquement, aucun panier/paiement — décision produit)
    "apps.boutique",
    # Bloc F — Portail agents (M7) : tableau de bord personnel, notes de service
    "apps.intranet",
    # Bloc F — Statistiques (M11) : tableaux de bord thématiques (visites, concours)
    "apps.statistiques",
    # Bloc G — Notifications (M14, EF-1405) : hookées dans apps.visites/apps.concours
    "apps.notifications",
    # Bloc G — Gestion électronique du courrier (M5) : jamais exposée côté public
    "apps.courrier",
    # Bloc G — Gestion électronique de documents (M6) : OCR réel (Tesseract), jamais
    # exposée côté public
    "apps.ged",
    # Bloc G — Ressources humaines (M8) + reste des demandes internes (M7) : jamais
    # exposées côté public
    "apps.rh",
    # Bloc G — Dossier numérique de la personne détenue (M10) : données les plus
    # sensibles du système, jamais routées côté public (§6.3). L'isolement réseau
    # réel (VLAN/segment dédié) est une décision d'infrastructure de déploiement,
    # non exprimable dans ce socle Docker Compose de développement — voir le
    # docstring d'`apps.detenus.models` pour l'isolement applicatif effectivement
    # construit (jamais de route publique, RBAC par périmètre, chiffrement
    # applicatif de l'identité, journalisation intégrale des consultations).
    "apps.detenus",
    # Bloc G — Interconnexion (M14) : journal des échanges externes (EF-1401) et
    # rapprochement des paiements (EF-1404) — le reste (chaîne judiciaire, forces
    # de sécurité, plateformes gouvernementales) suppose des contreparties
    # externes réelles hors périmètre.
    "apps.interop",
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
        "BACKEND": "core.storage.StockageMedia",
        "OPTIONS": {
            "access_key": config("MINIO_ACCESS_KEY", default="dgap"),
            "secret_key": config("MINIO_SECRET_KEY", default="dgap-dev-secret"),
            "bucket_name": config("MINIO_BUCKET", default="dgap-medias"),
            "endpoint_url": config("MINIO_ENDPOINT_URL", default="http://localhost:9000"),
            "region_name": config("MINIO_REGION", default="us-east-1"),
            "default_acl": "private",
            "file_overwrite": False,
            "verify": config("MINIO_VERIFY_SSL", default=True, cast=bool),
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
        "renvoi-suivi": "5/hour",
    },
}

DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL", default="ne-pas-repondre@administrationpenitentiaire.sn"
)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
}

# Clé de signature des charges QR (permis de visite, convocations — §10). Dédiée et
# distincte de SECRET_KEY ; à défaut (dev), on retombe sur SECRET_KEY (core.qr_signe).
QR_SIGNING_KEY = config("QR_SIGNING_KEY", default="")

# Clé de chiffrement applicatif AES-256-GCM (identité des personnes détenues, §9.3,
# apps.detenus) — 32 octets encodés en base64. Valeur de dev ci-dessous **non
# sécurisée** (générée une fois, partagée dans le dépôt) : à remplacer impérativement
# par une valeur secrète propre à chaque environnement réel (core.chiffrement).
CLE_CHIFFREMENT_DONNEES = config(
    "CLE_CHIFFREMENT_DONNEES", default="c2VjcmV0LWRldi11bmlxdWVtZW50LTMyLW9jdGV0cyE="
)

SPECTACULAR_SETTINGS = {
    "TITLE": "API DGAP",
    "DESCRIPTION": "Direction Générale de l'Administration Pénitentiaire — Sénégal. API REST v1.",
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.1.0",  # §4.2 — OpenAPI 3.1 imposé par le cahier des charges.
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    # Plusieurs modèles ont un champ `statut` avec des choix distincts : sans ceci,
    # drf-spectacular génère des noms d'enum arbitraires (« StatutB45Enum ») en cas
    # de collision.
    "ENUM_NAME_OVERRIDES": {
        "StatutContenuEnum": "apps.contenus.models.StatutContenu",
        "StatutContactEnum": "apps.demarches.models.StatutContact",
        "StatutDocumentEnum": "apps.mediatheque.models.StatutDocument",
        "StatutDemandeVisiteEnum": "apps.visites.models.StatutDemandeVisite",
        "TypeMediaEnum": "apps.mediatheque.models.TypeMedia",
        "TypePerimetreEnum": "apps.comptes.models.Perimetre.TypePerimetre",
        "StatutConcoursEnum": "apps.concours.models.StatutConcours",
        "StatutCandidatureEnum": "apps.concours.models.StatutCandidature",
        "StatutPaiementEnum": "apps.paiements.models.StatutPaiement",
        "TypePieceVisiteEnum": "apps.visites.models.TypePieceVisite",
        "TypePieceCandidatureEnum": "apps.concours.models.TypePieceCandidature",
        # Valeurs identiques dans apps.visites et apps.concours (même concept de
        # contrôle de pièce jointe) — drf-spectacular les traite comme un seul et
        # même jeu de choix ; un seul nom d'override est possible pour les deux.
        "StatutControlePieceEnum": "apps.visites.models.StatutControlePiece",
        "NiveauConfidentialiteEnum": "apps.courrier.models.NiveauConfidentialite",
        "StatutCourrierEntrantEnum": "apps.courrier.models.StatutCourrierEntrant",
        "StatutReponseCourrierEnum": "apps.courrier.models.StatutReponse",
        "StatutCourrierSortantEnum": "apps.courrier.models.StatutCourrierSortant",
        "NatureDocumentEnum": "apps.mediatheque.models.NatureDocument",
        "NatureDocumentGedEnum": "apps.ged.models.NatureDocumentGed",
        "StatutEchangeExterneEnum": "apps.interop.models.StatutEchange",
    },
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
