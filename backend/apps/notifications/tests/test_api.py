import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.etablissements.models import Etablissement
from apps.notifications.models import Notification
from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement
from apps.visites.models import DemandeVisite

pytestmark = pytest.mark.django_db


def _agent_avec_scope(email: str, scope: str) -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email=email, mot_de_passe="x", est_agent_interne=True, mfa_active=True
    )
    role = Role.objects.create(code=f"role-{email}", libelle=email)
    permission, _ = Permission.objects.get_or_create(
        code=scope, defaults={"libelle": scope, "categorie": scope.split(":")[0]}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)
    return utilisateur


def _etablissement() -> Etablissement:
    region = Region.objects.create(code="dakar", nom="Dakar")
    direction = DirectionRegionale.objects.create(code="dakar-thies", nom="Dakar-Thiès")
    type_mac = TypeEtablissement.objects.create(code="mac", libelle="Maison d'arrêt")
    return Etablissement.objets.create(
        nom="MAC de Rebeuss",
        code="mac-rebeuss",
        type=type_mac,
        direction_regionale=direction,
        region=region,
    )


def test_journal_notifications_refuse_sans_scope():
    client = APIClient()
    client.force_authenticate(
        Utilisateur.objects.create_user(
            email="sans-scope-notif@example.sn",
            mot_de_passe="x",
            est_agent_interne=True,
            mfa_active=True,
        )
    )
    reponse = client.get("/api/v1/backoffice/notifications")
    assert reponse.status_code == 403


def test_journal_notifications_liste_et_filtre():
    Notification.objects.create(
        canal="EMAIL", destinataire="a@example.sn", contenu="x", statut="ENVOYE"
    )
    Notification.objects.create(
        canal="SMS", destinataire="+221770000000", contenu="x", statut="ENVOYE"
    )

    client = APIClient()
    client.force_authenticate(
        _agent_avec_scope("gestionnaire-notif@example.sn", "notifications:lire")
    )

    reponse = client.get("/api/v1/backoffice/notifications?canal=EMAIL")
    assert reponse.status_code == 200
    assert len(reponse.data["results"]) == 1
    assert reponse.data["results"][0]["destinataire"] == "a@example.sn"


def test_le_depot_dune_demande_de_visite_declenche_un_accuse_de_reception():
    etablissement = _etablissement()

    reponse = APIClient().post(
        "/api/v1/demandes-visite",
        {
            "visiteur_nom": "Ndiaye",
            "visiteur_prenom": "Awa",
            "visiteur_email": "awa.ndiaye@example.sn",
            "visiteur_telephone": "+221770000000",
            "lien_parente": "Épouse",
            "detenu_nom_declare": "Ndiaye",
            "detenu_prenom_declare": "Moussa",
            "etablissement": str(etablissement.pk),
            "date_souhaitee": "2026-08-15",
        },
        format="json",
    )

    assert reponse.status_code == 201, reponse.data
    assert len(mail.outbox) == 1
    assert "enregistrée sous le numéro" in mail.outbox[0].body
    assert Notification.objects.filter(canal="SMS").exists()


def test_une_transition_de_demande_declenche_une_notification_de_statut():
    etablissement = _etablissement()
    demande = DemandeVisite.objets.create(
        visiteur_nom="Ndiaye",
        visiteur_prenom="Awa",
        visiteur_email="awa.ndiaye@example.sn",
        visiteur_telephone="+221770000000",
        lien_parente="Épouse",
        detenu_nom_declare="Ndiaye",
        detenu_prenom_declare="Moussa",
        etablissement=etablissement,
        date_souhaitee="2026-08-15",
    )
    mail.outbox.clear()

    demande.transitionner("instruire")

    assert len(mail.outbox) == 1
    assert "en cours d'instruction" in mail.outbox[0].body
