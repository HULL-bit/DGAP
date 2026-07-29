from datetime import date, timedelta

import pytest

from apps.courrier.models import (
    CourrierEntrant,
    NiveauConfidentialite,
    ReponseCourrier,
    StatutCourrierEntrant,
    StatutReponse,
    TransitionInvalide,
)

pytestmark = pytest.mark.django_db


def _courrier(**overrides) -> CourrierEntrant:
    valeurs = {"expediteur": "Ministère de la Justice", "objet": "Demande de rapport"}
    valeurs.update(overrides)
    return CourrierEntrant.objets.create(**valeurs)


def test_le_numero_est_genere_automatiquement():
    courrier = _courrier()
    assert courrier.numero.startswith("COUR-E-")


def test_le_cycle_complet_daffectation_et_de_traitement():
    courrier = _courrier()
    assert courrier.statut == StatutCourrierEntrant.ENREGISTRE

    courrier.transitionner("affecter", instructions="Traiter en urgence")
    assert courrier.statut == StatutCourrierEntrant.AFFECTE
    assert courrier.affectations.count() == 1

    courrier.transitionner("prendre_en_charge")
    assert courrier.statut == StatutCourrierEntrant.EN_TRAITEMENT

    courrier.transitionner("traiter")
    assert courrier.statut == StatutCourrierEntrant.TRAITE

    courrier.transitionner("cloturer")
    assert courrier.statut == StatutCourrierEntrant.CLOS


def test_une_transition_non_autorisee_leve_une_exception():
    courrier = _courrier()
    with pytest.raises(TransitionInvalide):
        courrier.transitionner("traiter")


def test_est_en_retard_selon_le_delai_et_le_statut():
    hier = date.today() - timedelta(days=1)
    courrier = _courrier(delai_reponse=hier)
    assert courrier.est_en_retard is True

    courrier.transitionner("affecter")
    courrier.transitionner("prendre_en_charge")
    courrier.transitionner("traiter")
    assert courrier.est_en_retard is False  # traité : plus en retard malgré le délai dépassé


def test_le_cycle_de_reponse_trace_le_signataire():
    courrier = _courrier()
    reponse = ReponseCourrier.objects.create(courrier=courrier, contenu="Projet de réponse")
    assert reponse.statut == StatutReponse.BROUILLON

    reponse.transitionner("viser")
    assert reponse.statut == StatutReponse.VISE

    from apps.comptes.models import Utilisateur

    signataire = Utilisateur.objects.create_user(email="signataire@example.sn", mot_de_passe="x")
    reponse.transitionner("valider", acteur=signataire)
    assert reponse.statut == StatutReponse.VALIDE
    assert reponse.signataire == signataire
    assert reponse.date_signature is not None

    reponse.transitionner("expedier")
    assert reponse.statut == StatutReponse.EXPEDIE


def test_courriers_visibles_par_exclut_les_confidentiels_sans_scope():
    from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
    from apps.courrier.models import courriers_entrants_visibles_par

    _courrier(confidentialite=NiveauConfidentialite.NORMAL)
    _courrier(objet="Dossier sensible", confidentialite=NiveauConfidentialite.SECRET)

    agent_sans_habilitation = Utilisateur.objects.create_user(
        email="sans-habilitation@example.sn", mot_de_passe="x"
    )
    assert courriers_entrants_visibles_par(agent_sans_habilitation).count() == 1

    agent_habilite = Utilisateur.objects.create_user(email="habilite@example.sn", mot_de_passe="x")
    role = Role.objects.create(code="role-habilite", libelle="Habilité")
    permission, _ = Permission.objects.get_or_create(
        code="courrier:confidentiel", defaults={"libelle": "x", "categorie": "courrier"}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=agent_habilite, role=role, perimetre=None)
    assert courriers_entrants_visibles_par(agent_habilite).count() == 2
