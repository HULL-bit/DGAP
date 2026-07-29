import pytest
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.etablissements.models import Etablissement
from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement
from apps.visites.models import DemandeVisite, StatutDemandeVisite
from apps.visites.views import PermisPDFParNumeroView, PermisPDFView
from core.qr_signe import verifier_charge

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


def _utilisateur_avec_scopes(email: str, *scopes: str, mfa_active: bool = True) -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email=email, mot_de_passe="x", est_agent_interne=True, mfa_active=mfa_active
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


def _charge_depot(etablissement: Etablissement) -> dict:
    return {
        "visiteur_nom": "Ndiaye",
        "visiteur_prenom": "Awa",
        "visiteur_email": "awa.ndiaye@example.sn",
        "visiteur_telephone": "+221770000000",
        "lien_parente": "Épouse",
        "detenu_nom_declare": "Ndiaye",
        "detenu_prenom_declare": "Moussa",
        "etablissement": str(etablissement.id),
        "date_souhaitee": "2026-08-15",
    }


def test_depot_public_cree_une_demande_et_renvoie_lassenumero_et_le_code():
    reponse = APIClient().post(
        "/api/v1/demandes-visite", _charge_depot(_etablissement()), format="json"
    )
    assert reponse.status_code == 201
    assert reponse.data["statut"] == "SOUMISE"
    assert reponse.data["numero_suivi"].startswith("DGAP-VIS-")
    assert len(reponse.data["code_suivi"]) == 6


def test_le_depot_public_est_idempotent_sur_lentete_idempotency_key():
    charge = _charge_depot(_etablissement())
    client = APIClient()

    premiere = client.post(
        "/api/v1/demandes-visite", charge, format="json", HTTP_IDEMPOTENCY_KEY="cle-abc-123"
    )
    seconde = client.post(
        "/api/v1/demandes-visite", charge, format="json", HTTP_IDEMPOTENCY_KEY="cle-abc-123"
    )

    assert premiere.status_code == 201
    assert seconde.status_code == 200
    assert premiere.data["numero_suivi"] == seconde.data["numero_suivi"]
    assert DemandeVisite.tous_les_objets.count() == 1


def test_le_suivi_public_exige_le_numero_et_le_bon_code():
    demande = DemandeVisite.objets.create(
        visiteur_nom="Ndiaye",
        visiteur_prenom="Awa",
        visiteur_email="awa.ndiaye@example.sn",
        visiteur_telephone="+221770000000",
        lien_parente="Épouse",
        detenu_nom_declare="Ndiaye",
        detenu_prenom_declare="Moussa",
        etablissement=_etablissement(),
        date_souhaitee="2026-08-15",
    )

    client = APIClient()
    ok = client.get(
        f"/api/v1/demandes-visite/{demande.numero_suivi}/statut?code={demande.code_suivi}"
    )
    assert ok.status_code == 200
    assert ok.data["statut"] == "SOUMISE"

    mauvais_code = client.get(f"/api/v1/demandes-visite/{demande.numero_suivi}/statut?code=000000")
    assert mauvais_code.status_code == 404


def test_la_file_dinstruction_est_refusee_sans_authentification():
    reponse = APIClient().get("/api/v1/demandes-visite/instruction")
    assert reponse.status_code == 401


def test_la_file_dinstruction_est_refusee_tant_que_le_mfa_nest_pas_actif():
    agent = _utilisateur_avec_scopes(
        "agent-sans-mfa@example.sn", "visites:instruire", mfa_active=False
    )
    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.get("/api/v1/demandes-visite/instruction")
    assert reponse.status_code == 403


def test_la_file_dinstruction_est_refusee_sans_le_scope_visites_instruire():
    agent = _utilisateur_avec_scopes("agent-sans-scope@example.sn")
    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.get("/api/v1/demandes-visite/instruction")
    assert reponse.status_code == 403


def test_le_parcours_instruction_complet_delivre_un_permis_avec_qr_verifiable():
    etablissement = _etablissement()
    depot = APIClient().post("/api/v1/demandes-visite", _charge_depot(etablissement), format="json")
    demande_id = depot.data["id"]

    instructeur = _utilisateur_avec_scopes(
        "instructeur@example.sn", "visites:instruire", "visites:controler"
    )
    client = APIClient()
    client.force_authenticate(instructeur)

    for action in ("instruire", "valider", "delivrer_permis"):
        reponse = client.post(
            f"/api/v1/demandes-visite/instruction/{demande_id}/transition",
            {"action": action},
            format="json",
        )
        assert reponse.status_code == 200, reponse.data

    demande = DemandeVisite.tous_les_objets.get(pk=demande_id)
    assert demande.statut == StatutDemandeVisite.PERMIS_DELIVRE

    # Rendu via APIRequestFactory (et non APIClient) : le client de test Django
    # instrumente le rendu de template pour `response.context`, ce qui casse sous
    # Python 3.14 (BaseContext.__copy__ sur un objet super()) — bogue de
    # l'environnement de test, sans effet en dehors (vérifié hors test client).
    requete = APIRequestFactory().get(f"/api/v1/permis/{demande_id}/pdf")
    force_authenticate(requete, user=instructeur)
    pdf = PermisPDFView.as_view()(requete, demande_id=demande_id)
    assert pdf.status_code == 200
    assert pdf["Content-Type"] == "application/pdf"

    # Accès public par numéro + code (sans authentification ni UUID) : c'est ce que
    # la page de suivi côté démarches utilise pour proposer le téléchargement.
    requete_publique = APIRequestFactory().get(
        f"/api/v1/demandes-visite/{demande.numero_suivi}/permis/pdf?code={demande.code_suivi}"
    )
    pdf_public = PermisPDFParNumeroView.as_view()(
        requete_publique, numero_suivi=demande.numero_suivi
    )
    assert pdf_public.status_code == 200
    assert pdf_public["Content-Type"] == "application/pdf"

    permis = demande.permis
    verification = client.post(
        "/api/v1/permis/verification", {"jeton": permis.charge_qr_jws}, format="json"
    )
    assert verification.status_code == 200
    assert verification.data["valide"] is True
    charge_verifiee = verifier_charge(permis.charge_qr_jws)
    assert charge_verifiee is not None
    assert charge_verifiee["numero_permis"] == permis.numero_permis


def test_une_transition_invalide_renvoie_un_conflit():
    etablissement = _etablissement()
    depot = APIClient().post("/api/v1/demandes-visite", _charge_depot(etablissement), format="json")
    instructeur = _utilisateur_avec_scopes("instructeur-2@example.sn", "visites:instruire")
    client = APIClient()
    client.force_authenticate(instructeur)

    reponse = client.post(
        f"/api/v1/demandes-visite/instruction/{depot.data['id']}/transition",
        {"action": "delivrer_permis"},
        format="json",
    )
    assert reponse.status_code == 409


def test_le_renvoi_de_suivi_repond_generiquement_avec_ou_sans_correspondance():
    APIClient().post("/api/v1/demandes-visite", _charge_depot(_etablissement()), format="json")

    client = APIClient()
    avec_correspondance = client.post(
        "/api/v1/demandes-visite/renvoi", {"email": "awa.ndiaye@example.sn"}, format="json"
    )
    sans_correspondance = client.post(
        "/api/v1/demandes-visite/renvoi", {"email": "personne@example.sn"}, format="json"
    )

    assert avec_correspondance.status_code == 200
    assert sans_correspondance.status_code == 200
    assert avec_correspondance.data["detail"] == sans_correspondance.data["detail"]
