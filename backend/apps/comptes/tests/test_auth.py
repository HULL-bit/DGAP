import pytest
from rest_framework.test import APIClient

from apps.comptes.models import Utilisateur

pytestmark = pytest.mark.django_db


def _client() -> APIClient:
    return APIClient()


def test_connexion_reussie_pour_un_compte_citoyen_sans_mfa():
    Utilisateur.objects.create_user(
        email="citoyen@example.sn", mot_de_passe="mot-de-passe-tres-solide"
    )

    reponse = _client().post(
        "/api/v1/auth/connexion",
        {"email": "citoyen@example.sn", "password": "mot-de-passe-tres-solide"},
        format="json",
    )

    assert reponse.status_code == 200
    assert "access" in reponse.data
    assert reponse.data["utilisateur"]["email"] == "citoyen@example.sn"


def test_premiere_connexion_dun_agent_interne_reussit_sans_totp_pour_permettre_linscription_mfa():
    """Bootstrap : un compte interne peut se connecter une première fois sans code TOTP
    (le mot de passe seul suffit) afin d'atteindre /auth/mfa/inscription. Les endpoints
    métier sensibles restent bloqués tant que `mfa_active` est faux — voir
    `core.permissions.MFAConfirmee`, exercée par `apps.contenus.tests.test_api_backoffice`.
    """
    Utilisateur.objects.create_user(
        email="agent@administrationpenitentiaire.sn",
        mot_de_passe="mot-de-passe-tres-solide",
        est_agent_interne=True,
    )

    reponse = _client().post(
        "/api/v1/auth/connexion",
        {"email": "agent@administrationpenitentiaire.sn", "password": "mot-de-passe-tres-solide"},
        format="json",
    )

    assert reponse.status_code == 200
    assert reponse.data["utilisateur"]["mfa_active"] is False


def test_connexion_refusee_pour_un_agent_avec_mfa_actif_sans_code_totp_valide():
    Utilisateur.objects.create_user(
        email="agent-mfa@administrationpenitentiaire.sn",
        mot_de_passe="mot-de-passe-tres-solide",
        est_agent_interne=True,
        mfa_active=True,
    )

    reponse = _client().post(
        "/api/v1/auth/connexion",
        {
            "email": "agent-mfa@administrationpenitentiaire.sn",
            "password": "mot-de-passe-tres-solide",
        },
        format="json",
    )

    assert reponse.status_code == 400
    assert "mfa" in reponse.data.get("erreurs_champs", reponse.data)


def test_endpoint_moi_exige_authentification():
    reponse = _client().get("/api/v1/auth/moi")
    assert reponse.status_code == 401
    assert reponse.data["status"] == 401
    assert "correlation_id" in reponse.data
