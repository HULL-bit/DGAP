from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.audit.models import Action, JournalAction
from apps.comptes.models import AffectationRole, Perimetre, Permission, Role, Utilisateur
from apps.detenus.models import PersonneDetenue
from apps.etablissements.models import Etablissement
from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement

pytestmark = pytest.mark.django_db


def _etablissement(code: str = "mac-rebeuss") -> Etablissement:
    region = Region.objects.create(code=f"region-{code}", nom=code)
    direction = DirectionRegionale.objects.create(code=f"direction-{code}", nom=code)
    type_mac = TypeEtablissement.objects.get_or_create(
        code="mac", defaults={"libelle": "Maison d'arrêt"}
    )[0]
    return Etablissement.objets.create(
        nom=f"MAC de {code}", code=code, type=type_mac, direction_regionale=direction, region=region
    )


def _agent_avec_scopes(email: str, *scopes: str, perimetre: Perimetre | None = None) -> Utilisateur:
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
        AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=perimetre)
    return utilisateur


def test_creation_refusee_sans_scope_detenus_gerer():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-detenus@example.sn"))
    reponse = client.post(
        "/api/v1/backoffice/detenus/personnes",
        {
            "nom": "Diop",
            "prenom": "Amadou",
            "date_naissance": "1990-01-01",
            "sexe": "M",
            "situation_penale": "PREVENU",
            "etablissement": str(_etablissement().id),
            "date_ecrou": "2026-01-01",
        },
        format="json",
    )
    assert reponse.status_code == 403


def test_parcours_complet_creation_consultation_journalisee_et_transfert():
    etablissement_origine = _etablissement("mac-origine-api")
    etablissement_destination = _etablissement("mac-destination-api")
    gestionnaire = _agent_avec_scopes("gestionnaire-detenus@example.sn", "detenus:gerer")
    gestionnaire.est_superviseur_national = True
    gestionnaire.save(update_fields=["est_superviseur_national"])

    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/detenus/personnes",
        {
            "nom": "Fall",
            "prenom": "Ousmane",
            "date_naissance": "1985-05-12",
            "sexe": "M",
            "situation_penale": "CONDAMNE",
            "etablissement": str(etablissement_origine.id),
            "date_ecrou": "2026-01-15",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    personne_id = creation.data["id"]

    personne = PersonneDetenue.objets.get(pk=personne_id)
    assert personne.mouvements.count() == 1
    assert personne.mouvements.get().type_mouvement == "ECROU"

    avant = JournalAction.objets.filter(
        action=Action.CONSULTER, ressource_type="personne_detenue"
    ).count()
    detail = client.get(f"/api/v1/backoffice/detenus/personnes/{personne_id}")
    assert detail.status_code == 200
    assert detail.data["nom"] == "Fall"
    assert detail.data["prenom"] == "Ousmane"
    assert (
        JournalAction.objets.filter(
            action=Action.CONSULTER, ressource_type="personne_detenue"
        ).count()
        == avant + 1
    )

    transfert = client.post(
        f"/api/v1/backoffice/detenus/personnes/{personne_id}/mouvements",
        {
            "type_mouvement": "TRANSFERT",
            "etablissement_destination": str(etablissement_destination.id),
        },
        format="json",
    )
    assert transfert.status_code == 201, transfert.data
    assert transfert.data["etablissement"] == etablissement_destination.id
    assert len(transfert.data["mouvements"]) == 2

    edition = client.patch(
        f"/api/v1/backoffice/detenus/personnes/{personne_id}",
        {"date_liberation_prevue": "2030-01-01"},
        format="json",
    )
    assert edition.status_code == 200
    assert edition.data["date_liberation_prevue"] == "2030-01-01"


def test_liste_et_detail_restreints_au_perimetre_de_letablissement():
    etablissement_a = _etablissement("mac-a-api")
    etablissement_b = _etablissement("mac-b-api")

    gestionnaire_national = _agent_avec_scopes(
        "gestionnaire-national-detenus@example.sn", "detenus:gerer"
    )
    client_national = APIClient()
    client_national.force_authenticate(gestionnaire_national)
    personne_a = PersonneDetenue.objets.create(
        nom="X",
        prenom="Y",
        date_naissance=date(1990, 1, 1),
        sexe="M",
        situation_penale="PREVENU",
        etablissement=etablissement_a,
        date_ecrou=date(2026, 1, 1),
    )
    PersonneDetenue.objets.create(
        nom="Z",
        prenom="W",
        date_naissance=date(1990, 1, 1),
        sexe="F",
        situation_penale="PREVENU",
        etablissement=etablissement_b,
        date_ecrou=date(2026, 1, 1),
    )

    perimetre_a = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.ETABLISSEMENT, code="mac-a-api", libelle="MAC A"
    )
    agent_local = _agent_avec_scopes(
        "agent-local-detenus@example.sn", "detenus:consulter", perimetre=perimetre_a
    )
    client_local = APIClient()
    client_local.force_authenticate(agent_local)

    liste = client_local.get("/api/v1/backoffice/detenus/personnes")
    assert liste.status_code == 200
    assert len(liste.data["results"]) == 1
    assert liste.data["results"][0]["etablissement"] == etablissement_a.id

    detail_hors_perimetre = client_local.get(
        f"/api/v1/backoffice/detenus/personnes/{PersonneDetenue.objets.get(etablissement=etablissement_b).id}"
    )
    assert detail_hors_perimetre.status_code == 404  # hors périmètre, pas de fuite d'existence

    detail_dans_perimetre = client_local.get(
        f"/api/v1/backoffice/detenus/personnes/{personne_a.id}"
    )
    assert detail_dans_perimetre.status_code == 200
