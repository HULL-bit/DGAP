import pytest

from apps.etablissements.models import Etablissement
from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement
from apps.visites.models import DemandeVisite, StatutDemandeVisite, TransitionInvalide

pytestmark = pytest.mark.django_db


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


def _demande(etablissement: Etablissement) -> DemandeVisite:
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
    )


def test_une_nouvelle_demande_recoit_un_numero_et_un_code_de_suivi():
    demande = _demande(_etablissement())
    assert demande.numero_suivi.startswith("DGAP-VIS-2026-")
    assert len(demande.code_suivi) == 6
    assert demande.statut == StatutDemandeVisite.SOUMISE


def test_les_numeros_de_suivi_sont_sequentiels_par_annee():
    etablissement = _etablissement()
    premiere = _demande(etablissement)
    seconde = _demande(etablissement)
    assert premiere.numero_suivi != seconde.numero_suivi
    assert seconde.numero_suivi.endswith(f"{int(premiere.numero_suivi.rsplit('-', 1)[-1]) + 1:06d}")


def test_le_parcours_nominal_instruire_valider_delivrer_permis_fonctionne():
    demande = _demande(_etablissement())

    demande.transitionner("instruire")
    assert demande.statut == StatutDemandeVisite.EN_INSTRUCTION

    demande.transitionner("valider")
    assert demande.statut == StatutDemandeVisite.VALIDEE

    demande.transitionner("delivrer_permis")
    assert demande.statut == StatutDemandeVisite.PERMIS_DELIVRE


def test_demander_pieces_ramene_en_instruction_apres_reception():
    demande = _demande(_etablissement())
    demande.transitionner("instruire")

    demande.transitionner("demander_pieces")
    assert demande.statut == StatutDemandeVisite.PIECES_MANQUANTES

    demande.transitionner("instruire")
    assert demande.statut == StatutDemandeVisite.EN_INSTRUCTION


def test_rejeter_enregistre_le_motif():
    demande = _demande(_etablissement())
    demande.transitionner("instruire")
    demande.transitionner("rejeter", motif="Pièce d'identité illisible.")
    assert demande.statut == StatutDemandeVisite.REJETEE
    assert demande.motif_rejet == "Pièce d'identité illisible."


def test_une_transition_impossible_depuis_le_statut_courant_est_refusee():
    demande = _demande(_etablissement())
    with pytest.raises(TransitionInvalide):
        demande.transitionner("delivrer_permis")
    assert demande.statut == StatutDemandeVisite.SOUMISE


def test_une_demande_validee_ne_peut_pas_repartir_en_instruction():
    demande = _demande(_etablissement())
    demande.transitionner("instruire")
    demande.transitionner("valider")
    with pytest.raises(TransitionInvalide):
        demande.transitionner("instruire")
