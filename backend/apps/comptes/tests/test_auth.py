import re

import pytest
from rest_framework.test import APIClient

from apps.comptes.models import Utilisateur
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def _client() -> APIClient:
    return APIClient()


def _extraire_uid_et_jeton(contenu: str) -> tuple[str, str]:
    correspondance = re.search(r"uid=([^&\s]+)&jeton=([^&\s]+)", contenu)
    assert correspondance is not None, contenu
    return correspondance.group(1), correspondance.group(2)


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


def test_demande_de_reinitialisation_pour_un_compte_inconnu_repond_200_sans_rien_creer():
    """Ne doit pas permettre l'énumération des comptes par l'adresse e-mail."""
    reponse = _client().post(
        "/api/v1/auth/mot-de-passe-oublie", {"email": "inconnu@example.sn"}, format="json"
    )

    assert reponse.status_code == 200
    assert Notification.objects.count() == 0


def test_parcours_complet_de_reinitialisation_du_mot_de_passe():
    utilisateur = Utilisateur.objects.create_user(
        email="oublie@example.sn", mot_de_passe="ancien-mot-de-passe-solide"
    )

    reponse = _client().post(
        "/api/v1/auth/mot-de-passe-oublie", {"email": "OUBLIE@example.sn"}, format="json"
    )
    assert reponse.status_code == 200

    notification = Notification.objects.get(destinataire="oublie@example.sn")
    uid, jeton = _extraire_uid_et_jeton(notification.contenu)

    reponse_faible = _client().post(
        "/api/v1/auth/mot-de-passe-oublie/confirmation",
        {"uid": uid, "jeton": jeton, "nouveau_mot_de_passe": "azerty"},
        format="json",
    )
    assert reponse_faible.status_code == 400
    assert "nouveau_mot_de_passe" in reponse_faible.data.get("erreurs_champs", reponse_faible.data)

    reponse = _client().post(
        "/api/v1/auth/mot-de-passe-oublie/confirmation",
        {"uid": uid, "jeton": jeton, "nouveau_mot_de_passe": "nouveau-mot-de-passe-tres-solide"},
        format="json",
    )
    assert reponse.status_code == 200

    utilisateur.refresh_from_db()
    assert utilisateur.check_password("nouveau-mot-de-passe-tres-solide")

    reponse_ancien = _client().post(
        "/api/v1/auth/connexion",
        {"email": "oublie@example.sn", "password": "ancien-mot-de-passe-solide"},
        format="json",
    )
    assert reponse_ancien.status_code == 401

    reponse_reutilisation = _client().post(
        "/api/v1/auth/mot-de-passe-oublie/confirmation",
        {"uid": uid, "jeton": jeton, "nouveau_mot_de_passe": "encore-un-autre-mot-de-passe"},
        format="json",
    )
    assert reponse_reutilisation.status_code == 400


def test_reinitialisation_refusee_avec_un_jeton_invalide():
    Utilisateur.objects.create_user(
        email="jeton-invalide@example.sn", mot_de_passe="mot-de-passe-tres-solide"
    )

    reponse = _client().post(
        "/api/v1/auth/mot-de-passe-oublie", {"email": "jeton-invalide@example.sn"}, format="json"
    )
    notification = Notification.objects.get(destinataire="jeton-invalide@example.sn")
    uid, _jeton = _extraire_uid_et_jeton(notification.contenu)

    reponse = _client().post(
        "/api/v1/auth/mot-de-passe-oublie/confirmation",
        {
            "uid": uid,
            "jeton": "jeton-bidon",
            "nouveau_mot_de_passe": "un-autre-mot-de-passe-solide",
        },
        format="json",
    )
    assert reponse.status_code == 400
