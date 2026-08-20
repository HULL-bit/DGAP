import pytest
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Perimetre, Permission, Role, Utilisateur

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


def test_liste_comptes_refusee_sans_scope_comptes_gerer():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-comptes@example.sn"))
    reponse = client.get("/api/v1/backoffice/comptes/utilisateurs")
    assert reponse.status_code == 403


def test_liste_comptes_avec_scope():
    gestionnaire = _agent_avec_scopes("lecteur-comptes@example.sn", "comptes:gerer")
    client = APIClient()
    client.force_authenticate(gestionnaire)
    reponse = client.get("/api/v1/backoffice/comptes/utilisateurs")
    assert reponse.status_code == 200
    assert reponse.data["results"][0]["email"] == "lecteur-comptes@example.sn"


def test_creation_dun_compte_et_modification():
    gestionnaire = _agent_avec_scopes("gestionnaire-comptes@example.sn", "comptes:gerer")
    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/comptes/utilisateurs",
        {
            "email": "nouvel-agent@administrationpenitentiaire.sn",
            "nom": "Fall",
            "prenom": "Awa",
            "est_agent_interne": True,
            "mot_de_passe": "mot-de-passe-tres-solide",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    compte_id = creation.data["id"]
    assert Utilisateur.objects.get(pk=compte_id).check_password("mot-de-passe-tres-solide")

    desactivation = client.patch(
        f"/api/v1/backoffice/comptes/utilisateurs/{compte_id}",
        {"is_active": False},
        format="json",
    )
    assert desactivation.status_code == 200
    assert desactivation.data["is_active"] is False
    assert Utilisateur.objects.filter(pk=compte_id).exists()  # jamais de suppression physique


def test_creation_dun_role_et_attribution_a_un_utilisateur():
    gestionnaire = _agent_avec_scopes("gestionnaire-roles@example.sn", "comptes:gerer")
    cible = _agent_avec_scopes("cible-role@example.sn")
    permission = Permission.objects.create(code="ged:consulter", libelle="Consulter la GED")
    perimetre = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.NATIONAL, code="national-test", libelle="National"
    )

    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation_role = client.post(
        "/api/v1/backoffice/comptes/roles",
        {
            "code": "archiviste-test",
            "libelle": "Archiviste",
            "permissions": [str(permission.id)],
        },
        format="json",
    )
    assert creation_role.status_code == 201, creation_role.data
    role_id = creation_role.data["id"]

    affectation = client.post(
        "/api/v1/backoffice/comptes/affectations-role",
        {"utilisateur": str(cible.id), "role": role_id, "perimetre": str(perimetre.id)},
        format="json",
    )
    assert affectation.status_code == 201, affectation.data
    assert "ged:consulter" in cible.scopes()

    revocation = client.post(
        f"/api/v1/backoffice/comptes/affectations-role/{affectation.data['id']}/revoquer"
    )
    assert revocation.status_code == 200
    assert revocation.data["actif"] is False
    assert "ged:consulter" not in cible.scopes()
    assert AffectationRole.objects.filter(pk=affectation.data["id"]).exists()  # jamais supprimé


def test_attribution_directe_temporaire_et_revocation():
    gestionnaire = _agent_avec_scopes("gestionnaire-attributions@example.sn", "comptes:gerer")
    cible = _agent_avec_scopes("cible-attribution@example.sn")
    permission = Permission.objects.create(code="stats:exporter", libelle="Exporter")

    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/comptes/attributions-permission",
        {
            "utilisateur": str(cible.id),
            "permission": str(permission.id),
            "motif": "Mission ponctuelle BI",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    assert "stats:exporter" in cible.scopes()

    revocation = client.post(
        f"/api/v1/backoffice/comptes/attributions-permission/{creation.data['id']}/revoquer"
    )
    assert revocation.status_code == 200
    assert "stats:exporter" not in cible.scopes()


def test_liste_permissions_est_en_lecture_seule():
    gestionnaire = _agent_avec_scopes("lecteur-permissions@example.sn", "comptes:gerer")
    Permission.objects.create(code="courrier:gerer", libelle="Gérer le courrier")
    client = APIClient()
    client.force_authenticate(gestionnaire)
    reponse = client.get("/api/v1/backoffice/comptes/permissions")
    assert reponse.status_code == 200
    assert len(reponse.data) >= 1


def test_reinitialisation_mfa_supprime_le_dispositif_totp_et_desactive_le_mfa():
    gestionnaire = _agent_avec_scopes("gestionnaire-mfa@example.sn", "comptes:gerer")
    cible = _agent_avec_scopes("cible-mfa@example.sn")
    TOTPDevice.objects.create(user=cible, name="dispositif-principal", confirmed=True)

    client = APIClient()
    client.force_authenticate(gestionnaire)
    reponse = client.post(f"/api/v1/backoffice/comptes/utilisateurs/{cible.pk}/reinitialiser-mfa")

    assert reponse.status_code == 200
    assert reponse.data["mfa_active"] is False
    cible.refresh_from_db()
    assert cible.mfa_active is False
    assert not TOTPDevice.objects.filter(user=cible).exists()


def test_reinitialisation_mfa_refusee_sans_scope_comptes_gerer():
    cible = _agent_avec_scopes("cible-mfa-refus@example.sn")
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-mfa@example.sn"))
    reponse = client.post(f"/api/v1/backoffice/comptes/utilisateurs/{cible.pk}/reinitialiser-mfa")
    assert reponse.status_code == 403
