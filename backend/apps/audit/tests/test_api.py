import pytest
from rest_framework.test import APIClient

from apps.audit.models import Action, JournalAction
from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur

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


def test_consultation_refusee_sans_scope_audit_consulter():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-audit@example.sn"))
    reponse = client.get("/api/v1/backoffice/audit/journal")
    assert reponse.status_code == 403


def test_consultation_filtree_par_type_de_ressource():
    JournalAction.tracer(
        acteur=None, action=Action.CONSULTER, ressource_type="courrier", ressource_id="1"
    )
    JournalAction.tracer(
        acteur=None, action=Action.CREER, ressource_type="document_ged", ressource_id="2"
    )

    auditeur = _agent_avec_scopes("auditeur@example.sn", "audit:consulter")
    client = APIClient()
    client.force_authenticate(auditeur)

    reponse = client.get("/api/v1/backoffice/audit/journal?ressource_type=courrier")
    assert reponse.status_code == 200
    assert len(reponse.data["results"]) == 1
    assert reponse.data["results"][0]["ressource_type"] == "courrier"


def test_consultation_expose_le_nom_de_lacteur():
    acteur = Utilisateur.objects.create_user(
        email="acteur@example.sn", mot_de_passe="x", nom="Diallo", prenom="Moussa"
    )
    JournalAction.tracer(
        acteur=acteur, action=Action.MODIFIER, ressource_type="dossier_rh", ressource_id="1"
    )

    auditeur = _agent_avec_scopes("auditeur2@example.sn", "audit:consulter")
    client = APIClient()
    client.force_authenticate(auditeur)

    reponse = client.get("/api/v1/backoffice/audit/journal")
    assert reponse.status_code == 200
    assert reponse.data["results"][0]["acteur_nom"] == "Moussa Diallo"
