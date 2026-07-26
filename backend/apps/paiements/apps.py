from django.apps import AppConfig


class PaiementsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.paiements"
    label = "paiements"
    verbose_name = "Passerelle de paiement (mock + mobile money) — Bloc E"
