from datetime import date, timedelta

import pytest
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.concours.models import Concours
from apps.paiements.models import Paiement, StatutPaiement

pytestmark = pytest.mark.django_db


def _agent_avec_scopes(email: str, *scopes: str) -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email=email, mot_de_passe="x", est_agent_interne=True, mfa_active=True
    )
    if scopes:
        role = Role.objects.create(code=f"role-{email}", libelle=email)
        permissions = [
            Permission.objects.get_or_create(
                code=s, defaults={"libelle": s, "categorie": s.split(":")[0]}
            )[0]
            for s in scopes
        ]
        role.permissions.set(permissions)
        AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)
    return utilisateur


def _paiement(**overrides) -> Paiement:
    concours = Concours.objets.create(
        titre="Concours test interop",
        code=overrides.pop("code", "interop-test"),
        date_ouverture=date(2026, 1, 1),
        date_cloture=date(2026, 12, 31),
    )
    valeurs = {
        "content_type": ContentType.objects.get_for_model(Concours),
        "object_id": concours.id,
        "montant": 5000,
        "statut": StatutPaiement.PAYE,
    }
    valeurs.update(overrides)
    paiement = Paiement.objects.create(**valeurs)
    return paiement


def test_liste_echanges_refusee_sans_scope():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-interop@example.sn"))
    reponse = client.get("/api/v1/backoffice/interop/echanges")
    assert reponse.status_code == 403


def test_enregistrement_manuel_dun_echange():
    gestionnaire = _agent_avec_scopes("gestionnaire-interop@example.sn", "interop:gerer")
    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/interop/echanges",
        {
            "systeme": "TRESOR",
            "direction": "SORTANT",
            "type_echange": "Transmission manuelle du rapprochement",
            "statut": "SUCCES",
            "charge": "contenu",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    assert creation.data["empreinte_charge"] != ""
    assert creation.data["acteur_nom"] == gestionnaire.get_full_name()

    liste = client.get("/api/v1/backoffice/interop/echanges")
    assert liste.status_code == 200
    assert len(liste.data["results"]) == 1


def test_lecteur_ne_peut_pas_enregistrer_un_echange():
    lecteur = _agent_avec_scopes("lecteur-interop@example.sn", "interop:consulter")
    client = APIClient()
    client.force_authenticate(lecteur)
    reponse = client.post(
        "/api/v1/backoffice/interop/echanges",
        {"systeme": "AUTRE", "direction": "SORTANT", "type_echange": "x", "statut": "SUCCES"},
        format="json",
    )
    assert reponse.status_code == 403


def test_rapprochement_paiements_totaux_et_anomalies():
    lecteur = _agent_avec_scopes("lecteur-rapprochement@example.sn", "interop:consulter")
    client = APIClient()
    client.force_authenticate(lecteur)

    _paiement(code="paye", montant=10000, statut=StatutPaiement.PAYE)
    _paiement(code="echec", montant=3000, statut=StatutPaiement.ECHEC)
    en_attente_recent = _paiement(
        code="attente-recent", montant=2000, statut=StatutPaiement.EN_ATTENTE
    )
    en_attente_ancien = _paiement(
        code="attente-ancien", montant=7000, statut=StatutPaiement.EN_ATTENTE
    )
    Paiement.objects.filter(pk=en_attente_ancien.pk).update(
        cree_le=timezone.now() - timedelta(days=10)
    )

    reponse = client.get("/api/v1/backoffice/interop/rapprochement-paiements")
    assert reponse.status_code == 200
    assert reponse.data["total_paye"] == 10000
    assert reponse.data["total_echec"] == 3000
    assert reponse.data["total_en_attente"] == 9000

    references_anomalies = [
        p["reference"] for p in reponse.data["paiements_en_attente_anormalement"]
    ]
    assert en_attente_ancien.reference in references_anomalies
    assert en_attente_recent.reference not in references_anomalies
