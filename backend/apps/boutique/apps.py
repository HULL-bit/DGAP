from django.apps import AppConfig


class BoutiqueConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.boutique"
    label = "boutique"
    verbose_name = "Boutique des ateliers de réinsertion"
