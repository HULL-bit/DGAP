from datetime import date

import pytest
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from apps.comptes.models import AffectationRole, Perimetre, Permission, Role, Utilisateur
from apps.rh.models import DossierAgent, SoldeConge, TypeDemandeRH

pytestmark = pytest.mark.django_db


def _perimetre(code: str = "national") -> Perimetre:
    perimetre, _ = Perimetre.objects.get_or_create(
        code=code, defaults={"type": Perimetre.TypePerimetre.NATIONAL, "libelle": code.title()}
    )
    return perimetre


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


def _dossier_pour(utilisateur: Utilisateur, **overrides) -> DossierAgent:
    valeurs = {"utilisateur": utilisateur, "corps": "Surveillants", "grade": "Surveillant"}
    valeurs.update(overrides)
    return DossierAgent.objets.create(**valeurs)


def test_mon_dossier_404_si_aucun_dossier_associe():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-dossier@example.sn"))
    reponse = client.get("/api/v1/rh/mon-dossier")
    assert reponse.status_code == 404


def test_mon_dossier_expose_le_dossier_propre():
    agent = _agent_avec_scopes("avec-dossier@example.sn")
    _dossier_pour(agent, grade="Surveillant principal")
    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.get("/api/v1/rh/mon-dossier")
    assert reponse.status_code == 200
    assert reponse.data["grade"] == "Surveillant principal"


def test_annuaire_recherche_par_nom():
    agent = _agent_avec_scopes("agent-annuaire@example.sn")
    agent.nom, agent.prenom = "Diouf", "Fatou"
    agent.save(update_fields=["nom", "prenom"])
    _dossier_pour(agent, corps="Surveillants")

    autre = _agent_avec_scopes("autre-annuaire@example.sn")
    _dossier_pour(autre, corps="Personnel administratif")

    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("lecteur-annuaire@example.sn"))
    reponse = client.get("/api/v1/rh/annuaire?q=Diouf")
    assert reponse.status_code == 200
    assert len(reponse.data["results"]) == 1
    assert reponse.data["results"][0]["nom"] == "Fatou Diouf"


def test_creation_demande_refusee_sans_dossier_rh():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-dossier-demande@example.sn"))
    reponse = client.post(
        "/api/v1/rh/demandes", {"type_demande": "AUTRE", "motif": "x"}, format="json"
    )
    assert reponse.status_code == 400


def test_parcours_complet_demande_conge_creation_validation_et_solde():
    perimetre = _perimetre("etablissement-test")
    agent = _agent_avec_scopes("demandeur-conge@example.sn")
    dossier = _dossier_pour(agent)
    dossier.affectations.create(perimetre=perimetre, date_debut=date(2020, 1, 1))
    SoldeConge.objects.create(dossier=dossier, annee=2026, jours_acquis=24)

    client = APIClient()
    client.force_authenticate(agent)
    creation = client.post(
        "/api/v1/rh/demandes",
        {
            "type_demande": "CONGE",
            "date_debut": "2026-08-01",
            "date_fin": "2026-08-05",
            "motif": "Congé annuel",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    demande_id = creation.data["id"]
    assert creation.data["numero"].startswith("DGAP-RH-")

    validateur = _agent_avec_scopes("validateur-conge@example.sn", "rh:valider")
    role_perimetre = AffectationRole.objects.get(utilisateur=validateur)
    role_perimetre.perimetre = perimetre
    role_perimetre.save(update_fields=["perimetre"])

    client_validateur = APIClient()
    client_validateur.force_authenticate(validateur)

    liste = client_validateur.get("/api/v1/rh/demandes")
    assert liste.status_code == 200
    assert len(liste.data["results"]) == 1

    transition = client_validateur.post(
        f"/api/v1/rh/demandes/{demande_id}/transition", {"action": "valider"}, format="json"
    )
    assert transition.status_code == 200, transition.data
    assert transition.data["statut"] == "VALIDEE"

    solde = SoldeConge.objects.get(dossier=dossier, annee=2026)
    assert solde.jours_pris == 5


def test_annuler_est_reserve_au_demandeur():
    agent = _agent_avec_scopes("proprietaire-demande@example.sn")
    dossier = _dossier_pour(agent)
    from apps.rh.models import DemandeRH

    demande = DemandeRH.objets.create(dossier=dossier, type_demande=TypeDemandeRH.AUTRE)

    # Un tiers sans lien avec la demande ne la voit même pas (pas de fuite
    # d'existence, même patron que `courriers_entrants_visibles_par`).
    autre_agent = _agent_avec_scopes("tiers-demande@example.sn")
    client_tiers = APIClient()
    client_tiers.force_authenticate(autre_agent)
    invisible = client_tiers.post(
        f"/api/v1/rh/demandes/{demande.id}/transition", {"action": "annuler"}, format="json"
    )
    assert invisible.status_code == 404

    # Un validateur voit la demande (scope `rh:gerer` : visibilité totale) mais
    # n'est pas le demandeur : l'action `annuler` lui est refusée (403).
    rh = _agent_avec_scopes("rh-tiers-demande@example.sn", "rh:gerer")
    client_rh = APIClient()
    client_rh.force_authenticate(rh)
    refus = client_rh.post(
        f"/api/v1/rh/demandes/{demande.id}/transition", {"action": "annuler"}, format="json"
    )
    assert refus.status_code == 403

    client_proprietaire = APIClient()
    client_proprietaire.force_authenticate(agent)
    ok = client_proprietaire.post(
        f"/api/v1/rh/demandes/{demande.id}/transition", {"action": "annuler"}, format="json"
    )
    assert ok.status_code == 200
    assert ok.data["statut"] == "ANNULEE"


def test_attestation_travail_indisponible_avant_validation_puis_pdf_apres():
    agent = _agent_avec_scopes("attestation@example.sn")
    dossier = _dossier_pour(agent)
    from apps.rh.models import DemandeRH

    demande = DemandeRH.objets.create(
        dossier=dossier, type_demande=TypeDemandeRH.ATTESTATION_TRAVAIL
    )

    from apps.rh.views import AttestationTravailPdfView

    # APIRequestFactory (et non APIClient) : le client de test Django instrumente
    # le rendu de template pour `response.context`, ce qui casse sous Python 3.14
    # (BaseContext.__copy__ sur un objet super()) — bogue de l'environnement de
    # test, sans effet en dehors (même contournement que `apps/concours/tests`).
    requete_avant = APIRequestFactory().get(f"/api/v1/rh/demandes/{demande.id}/attestation")
    force_authenticate(requete_avant, user=agent)
    avant = AttestationTravailPdfView.as_view()(requete_avant, pk=demande.id)
    assert avant.status_code == 409

    demande.transitionner("valider")
    requete_apres = APIRequestFactory().get(f"/api/v1/rh/demandes/{demande.id}/attestation")
    force_authenticate(requete_apres, user=agent)
    apres = AttestationTravailPdfView.as_view()(requete_apres, pk=demande.id)
    assert apres.status_code == 200
    assert apres["Content-Type"] == "application/pdf"


def test_dossiers_backoffice_refuse_sans_scope_rh_gerer():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-rh@example.sn"))
    reponse = client.get("/api/v1/backoffice/rh/dossiers")
    assert reponse.status_code == 403


def test_parcours_backoffice_creation_dossier_et_affectation():
    gestionnaire = _agent_avec_scopes("gestionnaire-rh@example.sn", "rh:gerer")
    agent_cible = _agent_avec_scopes("nouvel-agent-rh@example.sn")
    perimetre = _perimetre("etablissement-affectation")

    client = APIClient()
    client.force_authenticate(gestionnaire)
    creation = client.post(
        "/api/v1/backoffice/rh/dossiers",
        {"utilisateur": str(agent_cible.id), "corps": "Surveillants", "grade": "Surveillant"},
        format="json",
    )
    assert creation.status_code == 201, creation.data
    dossier_id = creation.data["id"]

    affectation = client.post(
        f"/api/v1/backoffice/rh/dossiers/{dossier_id}/affectations",
        {
            "perimetre": str(perimetre.id),
            "fonction": "Surveillant de quartier",
            "date_debut": "2026-01-01",
        },
        format="json",
    )
    assert affectation.status_code == 201, affectation.data
    assert len(affectation.data["affectations"]) == 1


def test_parcours_acte_carriere_avancement():
    gestionnaire = _agent_avec_scopes("gestionnaire-acte@example.sn", "rh:gerer")
    validateur = _agent_avec_scopes("validateur-acte@example.sn", "rh:valider", "rh:gerer")
    agent_cible = _agent_avec_scopes("agent-avancement@example.sn")
    dossier = _dossier_pour(agent_cible)

    client = APIClient()
    client.force_authenticate(gestionnaire)
    creation = client.post(
        "/api/v1/backoffice/rh/actes-carriere",
        {
            "dossier": str(dossier.id),
            "type_acte": "AVANCEMENT",
            "date_effet": "2026-01-01",
            "nouveau_grade": "Surveillant principal",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    acte_id = creation.data["id"]

    soumettre = client.post(
        f"/api/v1/backoffice/rh/actes-carriere/{acte_id}/transition",
        {"action": "soumettre"},
        format="json",
    )
    assert soumettre.status_code == 200
    assert soumettre.data["statut"] == "SOUMIS"

    client_validateur = APIClient()
    client_validateur.force_authenticate(validateur)
    valider = client_validateur.post(
        f"/api/v1/backoffice/rh/actes-carriere/{acte_id}/transition",
        {"action": "valider"},
        format="json",
    )
    assert valider.status_code == 200
    assert valider.data["statut"] == "VALIDE"

    dossier.refresh_from_db()
    assert dossier.grade == "Surveillant principal"
