from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.concours.models import Candidature, Concours, StatutCandidature, StatutConcours
from apps.etablissements.models import Etablissement
from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement
from apps.visites.models import DemandeVisite, StatutDemandeVisite

pytestmark = pytest.mark.django_db


def _etablissement(code: str = "mac-rebeuss") -> Etablissement:
    region = Region.objects.create(code=f"region-{code}", nom="Dakar")
    direction = DirectionRegionale.objects.create(code=f"direction-{code}", nom="Dakar-Thiès")
    type_mac = TypeEtablissement.objects.create(code=f"type-{code}", libelle="Maison d'arrêt")
    return Etablissement.objets.create(
        nom="MAC de Rebeuss", code=code, type=type_mac, direction_regionale=direction, region=region
    )


def _demande(
    etablissement: Etablissement, statut: str = StatutDemandeVisite.SOUMISE
) -> DemandeVisite:
    return DemandeVisite.objets.create(
        visiteur_nom="Ndiaye",
        visiteur_prenom="Awa",
        visiteur_email="awa.ndiaye@example.sn",
        visiteur_telephone="+221770000000",
        lien_parente="Épouse",
        detenu_nom_declare="Ndiaye",
        detenu_prenom_declare="Moussa",
        etablissement=etablissement,
        date_souhaitee="2026-08-15",
        statut=statut,
    )


def _concours(**overrides) -> Concours:
    valeurs = {
        "titre": "Concours d'inspecteurs",
        "code": "inspecteurs-2026",
        "date_ouverture": date(2026, 1, 1),
        "date_cloture": date(2026, 12, 31),
        "statut": StatutConcours.OUVERT,
    }
    valeurs.update(overrides)
    return Concours.objets.create(**valeurs)


def _candidature(concours: Concours, statut: str = StatutCandidature.SOUMISE) -> Candidature:
    return Candidature.objets.create(
        concours=concours,
        candidat_nom="Ndiaye",
        candidat_prenom="Awa",
        candidat_email="awa.ndiaye@example.sn",
        candidat_telephone="+221770000000",
        statut=statut,
    )


def _analyste() -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email="analyste@example.sn", mot_de_passe="x", est_agent_interne=True, mfa_active=True
    )
    role = Role.objects.create(code="role-analyste", libelle="Analyste")
    permission, _ = Permission.objects.get_or_create(
        code="stats:lire", defaults={"libelle": "Lire les statistiques", "categorie": "stats"}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)
    return utilisateur


def test_les_statistiques_sont_refusees_sans_scope():
    client = APIClient()
    client.force_authenticate(
        Utilisateur.objects.create_user(
            email="sans-scope-stats@example.sn",
            mot_de_passe="x",
            est_agent_interne=True,
            mfa_active=True,
        )
    )
    reponse = client.get("/api/v1/backoffice/statistiques/visites")
    assert reponse.status_code == 403


def test_statistiques_visites_agrege_par_statut_et_etablissement():
    etablissement = _etablissement()
    _demande(etablissement, statut=StatutDemandeVisite.SOUMISE)
    _demande(etablissement, statut=StatutDemandeVisite.SOUMISE)
    _demande(etablissement, statut=StatutDemandeVisite.VALIDEE)

    client = APIClient()
    client.force_authenticate(_analyste())
    reponse = client.get("/api/v1/backoffice/statistiques/visites")

    assert reponse.status_code == 200
    assert reponse.data["total"] == 3
    par_statut = {ligne["cle"]: ligne["total"] for ligne in reponse.data["par_statut"]}
    assert par_statut == {"SOUMISE": 2, "VALIDEE": 1}
    assert reponse.data["par_etablissement"] == [{"cle": "MAC de Rebeuss", "total": 3}]


def test_statistiques_visites_filtre_par_etablissement():
    mac_dakar = _etablissement("mac-dakar")
    mac_thies = _etablissement("mac-thies")
    _demande(mac_dakar)
    _demande(mac_thies)

    client = APIClient()
    client.force_authenticate(_analyste())
    reponse = client.get("/api/v1/backoffice/statistiques/visites?etablissement=mac-dakar")

    assert reponse.data["total"] == 1


def test_statistiques_concours_agrege_par_statut_et_concours():
    concours = _concours()
    _candidature(concours, statut=StatutCandidature.SOUMISE)
    _candidature(concours, statut=StatutCandidature.ADMIS)

    client = APIClient()
    client.force_authenticate(_analyste())
    reponse = client.get("/api/v1/backoffice/statistiques/concours")

    assert reponse.status_code == 200
    assert reponse.data["total"] == 2
    par_statut = {ligne["cle"]: ligne["total"] for ligne in reponse.data["par_statut"]}
    assert par_statut == {"SOUMISE": 1, "ADMIS": 1}
    assert reponse.data["par_concours"] == [{"cle": "Concours d'inspecteurs", "total": 2}]
