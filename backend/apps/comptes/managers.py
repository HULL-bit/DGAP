from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.contrib.auth.base_user import BaseUserManager

if TYPE_CHECKING:
    from .models import Utilisateur


class GestionnaireUtilisateur(BaseUserManager["Utilisateur"]):
    """Comptes nominatifs par e-mail (§6.3) — pas de nom d'utilisateur générique."""

    use_in_migrations = True

    def _creer(self, email: str, mot_de_passe: str | None, **extra: Any) -> Utilisateur:
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        email = self.normalize_email(email)
        utilisateur = self.model(email=email, **extra)
        utilisateur.set_password(mot_de_passe)
        utilisateur.save(using=self._db)
        return utilisateur

    def create_user(self, email: str, mot_de_passe: str | None = None, **extra: Any) -> Utilisateur:
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._creer(email, mot_de_passe, **extra)

    def create_superuser(
        self, email: str, mot_de_passe: str | None = None, **extra: Any
    ) -> Utilisateur:
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("est_agent_interne", True)
        return self._creer(email, mot_de_passe, **extra)
