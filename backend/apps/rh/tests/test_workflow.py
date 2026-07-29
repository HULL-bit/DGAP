from datetime import date

import pytest

from apps.comptes.models import Perimetre, Utilisateur
from apps.rh.models import (
    ActeCarriere,
    DemandeRH,
    DossierAgent,
    PositionAdministrative,
    SoldeConge,
    StatutActeCarriere,
    StatutDemandeRH,
    TransitionInvalide,
    TypeActeCarriere,
    TypeDemandeRH,
    actes_visibles_par,
    demandes_visibles_par,
    dossiers_visibles_par,
)

pytestmark = pytest.mark.django_db


def _perimetre(code: str = "national") -> Perimetre:
    return Perimetre.objects.create(
        code=code, type=Perimetre.TypePerimetre.NATIONAL, libelle=code.title()
    )


def _dossier(**overrides) -> DossierAgent:
    utilisateur = Utilisateur.objects.create_user(
        email=overrides.pop("email", "agent-rh@example.sn"), mot_de_passe="x"
    )
    valeurs = {"utilisateur": utilisateur, "corps": "Surveillants", "grade": "Surveillant"}
    valeurs.update(overrides)
    return DossierAgent.objets.create(**valeurs)


def test_affectation_active_est_celle_sans_date_de_fin():
    dossier = _dossier()
    perimetre = _perimetre()
    assert dossier.affectation_active is None

    dossier.affectations.create(
        perimetre=perimetre, fonction="Surveillant", date_debut=date(2020, 1, 1)
    )
    assert dossier.affectation_active is not None
    assert dossier.affectation_active.est_active is True


def test_acte_avancement_valide_met_a_jour_le_grade():
    dossier = _dossier()
    acte = ActeCarriere.objets.create(
        dossier=dossier,
        type_acte=TypeActeCarriere.AVANCEMENT,
        date_effet=date(2026, 1, 1),
        nouveau_grade="Surveillant principal",
    )
    assert acte.numero.startswith("DGAP-ACT-")

    acte.transitionner("soumettre")
    assert acte.statut == StatutActeCarriere.SOUMIS

    acte.transitionner("valider")
    assert acte.statut == StatutActeCarriere.VALIDE
    dossier.refresh_from_db()
    assert dossier.grade == "Surveillant principal"


def test_acte_mutation_valide_ferme_lancienne_affectation_et_en_cree_une_nouvelle():
    dossier = _dossier()
    ancien_perimetre = _perimetre("ancien")
    nouveau_perimetre = _perimetre("nouveau")
    dossier.affectations.create(
        perimetre=ancien_perimetre, fonction="Surveillant", date_debut=date(2020, 1, 1)
    )

    acte = ActeCarriere.objets.create(
        dossier=dossier,
        type_acte=TypeActeCarriere.MUTATION,
        date_effet=date(2026, 3, 1),
        nouveau_perimetre=nouveau_perimetre,
        nouvelle_fonction="Chef de quartier",
    )
    acte.transitionner("soumettre")
    acte.transitionner("valider")

    dossier.refresh_from_db()
    assert dossier.affectations.count() == 2
    ancienne = dossier.affectations.get(perimetre=ancien_perimetre)
    assert ancienne.date_fin == date(2026, 3, 1)
    active = dossier.affectation_active
    assert active is not None
    assert active.perimetre == nouveau_perimetre
    assert active.fonction == "Chef de quartier"


def test_acte_detachement_valide_change_la_position_administrative():
    dossier = _dossier()
    acte = ActeCarriere.objets.create(
        dossier=dossier, type_acte=TypeActeCarriere.DETACHEMENT, date_effet=date(2026, 1, 1)
    )
    acte.transitionner("soumettre")
    acte.transitionner("valider")

    dossier.refresh_from_db()
    assert dossier.position_administrative == PositionAdministrative.DETACHEMENT


def test_une_transition_dacte_non_autorisee_leve_une_exception():
    dossier = _dossier()
    acte = ActeCarriere.objets.create(
        dossier=dossier, type_acte=TypeActeCarriere.TITULARISATION, date_effet=date(2026, 1, 1)
    )
    with pytest.raises(TransitionInvalide):
        acte.transitionner("valider")


def test_demande_conge_validee_decompte_le_solde():
    dossier = _dossier()
    SoldeConge.objects.create(dossier=dossier, annee=2026, jours_acquis=24)

    demande = DemandeRH.objets.create(
        dossier=dossier,
        type_demande=TypeDemandeRH.CONGE,
        date_debut=date(2026, 8, 1),
        date_fin=date(2026, 8, 5),
    )
    assert demande.numero.startswith("DGAP-RH-")
    assert demande.nombre_jours == 5

    demande.transitionner("valider")
    assert demande.statut == StatutDemandeRH.VALIDEE

    solde = SoldeConge.objects.get(dossier=dossier, annee=2026)
    assert solde.jours_pris == 5
    assert solde.jours_restants == 19


def test_demande_rejetee_trace_le_motif():
    dossier = _dossier()
    demande = DemandeRH.objets.create(
        dossier=dossier, type_demande=TypeDemandeRH.PERMISSION_ABSENCE
    )
    demande.transitionner("rejeter", motif_rejet="Pièces manquantes")
    assert demande.statut == StatutDemandeRH.REJETEE
    assert demande.motif_rejet == "Pièces manquantes"


def test_demande_annulee_par_le_demandeur():
    dossier = _dossier()
    demande = DemandeRH.objets.create(dossier=dossier, type_demande=TypeDemandeRH.AUTRE)
    demande.transitionner("annuler")
    assert demande.statut == StatutDemandeRH.ANNULEE

    with pytest.raises(TransitionInvalide):
        demande.transitionner("valider")


def test_dossiers_visibles_par_restreint_au_dossier_propre_sans_scope_rh():
    _dossier(email="a@example.sn")
    _dossier(email="b@example.sn")
    agent = Utilisateur.objects.get(email="a@example.sn")
    assert dossiers_visibles_par(agent).count() == 1
    assert dossiers_visibles_par(agent).get().utilisateur == agent


def test_demandes_visibles_par_le_validateur_restreint_au_perimetre():
    from apps.comptes.models import AffectationRole, Permission, Role

    perimetre_a = _perimetre("etablissement-a")
    perimetre_b = _perimetre("etablissement-b")

    dossier_a = _dossier(email="agent-a@example.sn")
    dossier_a.affectations.create(perimetre=perimetre_a, date_debut=date(2020, 1, 1))
    DemandeRH.objets.create(dossier=dossier_a, type_demande=TypeDemandeRH.CONGE)

    dossier_b = _dossier(email="agent-b@example.sn")
    dossier_b.affectations.create(perimetre=perimetre_b, date_debut=date(2020, 1, 1))
    DemandeRH.objets.create(dossier=dossier_b, type_demande=TypeDemandeRH.CONGE)

    validateur = Utilisateur.objects.create_user(email="validateur@example.sn", mot_de_passe="x")
    role = Role.objects.create(code="validateur-rh", libelle="Validateur RH")
    permission, _ = Permission.objects.get_or_create(
        code="rh:valider", defaults={"libelle": "x", "categorie": "rh"}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=validateur, role=role, perimetre=perimetre_a)

    visibles = demandes_visibles_par(validateur)
    assert visibles.count() == 1
    assert visibles.get().dossier == dossier_a


def test_actes_visibles_par_rh_voit_tout():
    dossier = _dossier()
    ActeCarriere.objets.create(
        dossier=dossier, type_acte=TypeActeCarriere.TITULARISATION, date_effet=date(2026, 1, 1)
    )
    rh = Utilisateur.objects.create_user(
        email="rh@example.sn", mot_de_passe="x", est_superviseur_national=True
    )
    assert actes_visibles_par(rh).count() == 1
