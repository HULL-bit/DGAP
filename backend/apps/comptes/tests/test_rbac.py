import pytest

from apps.comptes.models import (
    AffectationRole,
    AttributionPermission,
    Perimetre,
    Permission,
    Role,
    Utilisateur,
)

pytestmark = pytest.mark.django_db


def test_scopes_agrege_les_permissions_du_role():
    utilisateur = Utilisateur.objects.create_user(email="greffier@example.sn", mot_de_passe="x")
    permission = Permission.objects.create(code="visites:instruire", libelle="Instruire une visite")
    role = Role.objects.create(code="greffier", libelle="Greffier")
    role.permissions.add(permission)
    AffectationRole.objects.create(utilisateur=utilisateur, role=role)

    assert utilisateur.scopes() == {"visites:instruire"}


def test_scopes_agrege_aussi_les_attributions_directes():
    utilisateur = Utilisateur.objects.create_user(email="delegue@example.sn", mot_de_passe="x")
    permission = Permission.objects.create(
        code="stats:exporter", libelle="Exporter les statistiques"
    )
    AttributionPermission.objects.create(
        utilisateur=utilisateur, permission=permission, motif="Délégation temporaire — mission BI"
    )

    assert utilisateur.scopes() == {"stats:exporter"}


def test_affectation_role_inactive_n_accorde_aucun_droit():
    utilisateur = Utilisateur.objects.create_user(email="ancien@example.sn", mot_de_passe="x")
    permission = Permission.objects.create(code="ged:consulter", libelle="Consulter la GED")
    role = Role.objects.create(code="archiviste", libelle="Archiviste")
    role.permissions.add(permission)
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, actif=False)

    assert utilisateur.scopes() == set()


def test_perimetres_autorises_agrege_role_et_attribution_directe():
    utilisateur = Utilisateur.objects.create_user(email="agent@example.sn", mot_de_passe="x")
    etablissement = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.ETABLISSEMENT, code="mac-dakar", libelle="MAC de Dakar"
    )
    direction = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.DIRECTION, code="irap-dakar", libelle="IRAP Dakar"
    )
    role = Role.objects.create(code="chef-etablissement", libelle="Chef d'établissement")
    permission = Permission.objects.create(code="etablissements:administrer", libelle="Administrer")

    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=etablissement)
    AttributionPermission.objects.create(
        utilisateur=utilisateur, permission=permission, perimetre=direction
    )

    assert utilisateur.perimetres_autorises() == {"mac-dakar", "irap-dakar"}
