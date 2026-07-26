from django.apps import AppConfig


class CourrierConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.courrier"
    label = "courrier"
    verbose_name = "Gestion du courrier (GEC, M5) — Bloc G, non exposé public"
