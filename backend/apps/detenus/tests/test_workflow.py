from datetime import date

import pytest
from django.db import connection

from apps.comptes.models import AffectationRole, Perimetre, Permission, Role, Utilisateur
from apps.detenus.models import (
    Mouvement,
    PersonneDetenue,
    StatutDossierDetenu,
    TypeMouvement,
    personnes_visibles_par,
)
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


def _personne(**overrides) -> PersonneDetenue:
    valeurs = {
        "nom": "Diop",
        "prenom": "Amadou",
        "date_naissance": date(1990, 1, 1),
        "sexe": "M",
        "situation_penale": "PREVENU",
        "etablissement": overrides.pop("etablissement", None) or _etablissement(),
        "date_ecrou": date(2026, 1, 1),
    }
    valeurs.update(overrides)
    return PersonneDetenue.objets.create(**valeurs)


def test_numero_ecrou_genere_avec_prefixe_etablissement():
    personne = _personne()
    assert personne.numero_ecrou.startswith(personne.etablissement.code.upper())


def test_identite_est_dechiffree_correctement_mais_jamais_stockee_en_clair():
    personne = _personne(nom="Ndiaye", prenom="Fatou")
    personne.refresh_from_db()
    assert personne.nom == "Ndiaye"
    assert personne.prenom == "Fatou"

    with connection.cursor() as curseur:
        curseur.execute(
            "SELECT nom, prenom FROM personnes_detenues WHERE id = %s", [str(personne.id)]
        )
        nom_brut, prenom_brut = curseur.fetchone()

    assert bytes(nom_brut) != b"Ndiaye"
    assert b"Ndiaye" not in bytes(nom_brut)
    assert bytes(prenom_brut) != b"Fatou"
    assert b"Fatou" not in bytes(prenom_brut)


def test_transfert_change_letablissement_et_conserve_le_statut_ecroue():
    origine = _etablissement("mac-origine")
    destination = _etablissement("mac-destination")
    personne = _personne(etablissement=origine)

    personne.enregistrer_mouvement(TypeMouvement.TRANSFERT, etablissement_destination=destination)

    personne.refresh_from_db()
    assert personne.etablissement == destination
    assert personne.statut_dossier == StatutDossierDetenu.ECROUE
    assert personne.mouvements.count() == 1
    assert personne.mouvements.get().etablissement_destination == destination


def test_levee_decrou_libere_le_dossier():
    personne = _personne()
    personne.enregistrer_mouvement(TypeMouvement.LEVEE_ECROU, motif="Fin de peine")
    personne.refresh_from_db()
    assert personne.statut_dossier == StatutDossierDetenu.LIBERE


def test_evasion_puis_reintegration():
    personne = _personne()
    personne.enregistrer_mouvement(TypeMouvement.EVASION)
    personne.refresh_from_db()
    assert personne.statut_dossier == StatutDossierDetenu.EVADE

    personne.enregistrer_mouvement(TypeMouvement.REINTEGRATION)
    personne.refresh_from_db()
    assert personne.statut_dossier == StatutDossierDetenu.ECROUE
    assert personne.mouvements.count() == 2


def test_extraction_est_tracee_sans_changer_le_statut():
    personne = _personne()
    personne.enregistrer_mouvement(TypeMouvement.EXTRACTION, motif="Audience judiciaire")
    personne.refresh_from_db()
    assert personne.statut_dossier == StatutDossierDetenu.ECROUE
    assert Mouvement.objects.filter(
        personne=personne, type_mouvement=TypeMouvement.EXTRACTION
    ).exists()


def test_personnes_visibles_par_restreint_au_perimetre_de_letablissement():
    etablissement_a = _etablissement("mac-a")
    etablissement_b = _etablissement("mac-b")
    _personne(etablissement=etablissement_a)
    _personne(etablissement=etablissement_b)

    agent = Utilisateur.objects.create_user(email="agent-detenus@example.sn", mot_de_passe="x")
    role = Role.objects.create(code="agent-detenus-test", libelle="Agent détenus")
    permission, _ = Permission.objects.get_or_create(
        code="detenus:consulter", defaults={"libelle": "x", "categorie": "detenus"}
    )
    role.permissions.set([permission])
    perimetre = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.ETABLISSEMENT, code="mac-a", libelle="MAC A"
    )
    AffectationRole.objects.create(utilisateur=agent, role=role, perimetre=perimetre)

    visibles = personnes_visibles_par(agent)
    assert visibles.count() == 1
    assert visibles.get().etablissement == etablissement_a


def test_personnes_visibles_par_superviseur_national_voit_tout():
    _personne(etablissement=_etablissement("mac-x"))
    _personne(etablissement=_etablissement("mac-y"))
    superviseur = Utilisateur.objects.create_user(
        email="superviseur-detenus@example.sn", mot_de_passe="x", est_superviseur_national=True
    )
    assert personnes_visibles_par(superviseur).count() == 2
