from datetime import date

import pytest

from apps.concours.models import (
    Candidature,
    Concours,
    StatutCandidature,
    StatutConcours,
    TransitionInvalide,
)

pytestmark = pytest.mark.django_db


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


def _candidature(concours: Concours) -> Candidature:
    return Candidature.objets.create(
        concours=concours,
        candidat_nom="Ndiaye",
        candidat_prenom="Awa",
        candidat_email="awa.ndiaye@example.sn",
        candidat_telephone="+221770000000",
    )


def test_une_nouvelle_candidature_recoit_un_numero_et_un_code_de_suivi():
    candidature = _candidature(_concours())
    assert candidature.numero_suivi.startswith("CONC-2026-")
    assert len(candidature.code_suivi) == 6
    assert candidature.statut == StatutCandidature.SOUMISE


def test_le_concours_est_ouvert_seulement_dans_la_fenetre_et_au_bon_statut():
    ouvert = _concours()
    assert ouvert.est_ouvert() is True

    brouillon = _concours(code="brouillon-2026", statut=StatutConcours.BROUILLON)
    assert brouillon.est_ouvert() is False

    cloture = _concours(
        code="cloture-2026",
        date_ouverture=date(2020, 1, 1),
        date_cloture=date(2020, 12, 31),
        statut=StatutConcours.OUVERT,
    )
    assert cloture.est_ouvert() is False


def test_le_parcours_nominal_instruire_admissible_convoquer_admettre_fonctionne():
    candidature = _candidature(_concours())

    candidature.transitionner("instruire")
    assert candidature.statut == StatutCandidature.EN_INSTRUCTION

    candidature.transitionner("declarer_admissible")
    assert candidature.statut == StatutCandidature.ADMISSIBLE

    candidature.transitionner("convoquer")
    assert candidature.statut == StatutCandidature.CONVOQUE

    candidature.transitionner("admettre")
    assert candidature.statut == StatutCandidature.ADMIS


def test_demander_pieces_ramene_en_instruction_apres_reception():
    candidature = _candidature(_concours())
    candidature.transitionner("instruire")

    candidature.transitionner("demander_pieces")
    assert candidature.statut == StatutCandidature.PIECES_MANQUANTES

    candidature.transitionner("instruire")
    assert candidature.statut == StatutCandidature.EN_INSTRUCTION


def test_rejeter_enregistre_le_motif():
    candidature = _candidature(_concours())
    candidature.transitionner("instruire")
    candidature.transitionner("rejeter", motif="Dossier incomplet.")
    assert candidature.statut == StatutCandidature.REJETE
    assert candidature.motif_rejet == "Dossier incomplet."


def test_une_transition_impossible_depuis_le_statut_courant_est_refusee():
    candidature = _candidature(_concours())
    with pytest.raises(TransitionInvalide):
        candidature.transitionner("convoquer")
    assert candidature.statut == StatutCandidature.SOUMISE
