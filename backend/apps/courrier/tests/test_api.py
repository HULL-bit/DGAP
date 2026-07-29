import pytest
from rest_framework.test import APIClient

from apps.audit.models import JournalAction
from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.courrier.models import CourrierEntrant, NiveauConfidentialite, ReponseCourrier

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


def test_la_creation_est_refusee_sans_scope():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-courrier@example.sn"))
    reponse = client.post(
        "/api/v1/backoffice/courrier/entrant",
        {"expediteur": "x", "objet": "x", "date_reception": "2026-07-01"},
        format="json",
    )
    assert reponse.status_code == 403


def test_le_parcours_complet_creation_affectation_et_reponse():
    gestionnaire = _agent_avec_scopes(
        "gestionnaire-courrier@example.sn", "courrier:gerer", "courrier:viser", "courrier:valider"
    )
    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/courrier/entrant",
        {"expediteur": "Cour suprême", "objet": "Réquisition", "date_reception": "2026-07-01"},
        format="json",
    )
    assert creation.status_code == 201, creation.data
    courrier_id = creation.data["id"]
    assert creation.data["numero"].startswith("COUR-E-")

    transition = client.post(
        f"/api/v1/backoffice/courrier/entrant/{courrier_id}/transition",
        {"action": "affecter"},
        format="json",
    )
    assert transition.status_code == 200
    assert transition.data["statut"] == "AFFECTE"
    assert len(transition.data["affectations"]) == 1

    reponse_creation = client.post(
        f"/api/v1/backoffice/courrier/entrant/{courrier_id}/reponses",
        {"contenu": "Nous accusons réception..."},
        format="json",
    )
    assert reponse_creation.status_code == 201, reponse_creation.data
    reponse_id = reponse_creation.data["id"]

    viser = client.post(
        f"/api/v1/backoffice/courrier/reponses/{reponse_id}/transition",
        {"action": "viser"},
        format="json",
    )
    assert viser.status_code == 200
    assert viser.data["statut"] == "VISE"

    valider = client.post(
        f"/api/v1/backoffice/courrier/reponses/{reponse_id}/transition",
        {"action": "valider"},
        format="json",
    )
    assert valider.status_code == 200
    assert valider.data["statut"] == "VALIDE"
    reponse = ReponseCourrier.objects.get(pk=reponse_id)
    assert reponse.signataire == gestionnaire
    assert reponse.date_signature is not None


def test_la_liste_exclut_les_confidentiels_et_le_detail_journalise_la_consultation():
    CourrierEntrant.objets.create(
        expediteur="a", objet="Normal", confidentialite=NiveauConfidentialite.NORMAL
    )
    secret = CourrierEntrant.objets.create(
        expediteur="b", objet="Secret défense", confidentialite=NiveauConfidentialite.SECRET
    )

    lecteur = _agent_avec_scopes("lecteur-courrier@example.sn", "courrier:gerer")
    client = APIClient()
    client.force_authenticate(lecteur)

    liste = client.get("/api/v1/backoffice/courrier/entrant")
    assert liste.status_code == 200
    assert len(liste.data["results"]) == 1

    detail_refuse = client.get(f"/api/v1/backoffice/courrier/entrant/{secret.id}")
    assert detail_refuse.status_code == 404  # hors queryset visible, pas de fuite d'existence

    habilite = _agent_avec_scopes(
        "habilite-courrier@example.sn", "courrier:gerer", "courrier:confidentiel"
    )
    client.force_authenticate(habilite)
    avant = JournalAction.objets.count()
    detail = client.get(f"/api/v1/backoffice/courrier/entrant/{secret.id}")
    assert detail.status_code == 200
    assert JournalAction.objets.count() == avant + 1
