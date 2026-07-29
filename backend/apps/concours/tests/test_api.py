import base64

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.concours.models import Candidature, Concours, StatutCandidature, StatutConcours
from apps.concours.views import ConvocationPDFParNumeroView, ConvocationPDFView
from apps.paiements.models import StatutPaiement
from core.qr_signe import verifier_charge

pytestmark = pytest.mark.django_db

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
STOCKAGE_LOCAL_TEST = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def _concours(**overrides) -> Concours:
    valeurs = {
        "titre": "Concours d'inspecteurs",
        "code": "inspecteurs-2026-api",
        "date_ouverture": "2026-01-01",
        "date_cloture": "2026-12-31",
        "statut": StatutConcours.OUVERT,
        "frais_inscription": 5000,
    }
    valeurs.update(overrides)
    return Concours.objets.create(**valeurs)


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


def _charge_depot(concours: Concours) -> dict:
    return {
        "concours": str(concours.id),
        "candidat_nom": "Ndiaye",
        "candidat_prenom": "Awa",
        "candidat_email": "awa.ndiaye@example.sn",
        "candidat_telephone": "+221770000000",
        "niveau_etude": "Licence",
        "experience": "",
    }


def test_le_depot_est_refuse_si_le_concours_nest_pas_ouvert():
    concours = _concours(code="brouillon-api", statut=StatutConcours.BROUILLON)
    reponse = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    assert reponse.status_code == 400


def test_depot_public_cree_une_candidature_et_un_paiement_en_attente():
    concours = _concours()
    reponse = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    assert reponse.status_code == 201
    assert reponse.data["statut"] == "SOUMISE"
    assert reponse.data["numero_suivi"].startswith("CONC-")
    assert reponse.data["paiement"]["statut"] == "EN_ATTENTE"
    assert reponse.data["paiement"]["montant"] == "5000"


def test_le_depot_public_est_idempotent_sur_lentete_idempotency_key():
    concours = _concours(code="idem-api")
    charge = _charge_depot(concours)
    client = APIClient()

    premiere = client.post(
        "/api/v1/candidatures", charge, format="json", HTTP_IDEMPOTENCY_KEY="cle-conc-123"
    )
    seconde = client.post(
        "/api/v1/candidatures", charge, format="json", HTTP_IDEMPOTENCY_KEY="cle-conc-123"
    )

    assert premiere.status_code == 201
    assert seconde.status_code == 200
    assert premiere.data["numero_suivi"] == seconde.data["numero_suivi"]
    assert Candidature.tous_les_objets.filter(concours=concours).count() == 1


def test_le_paiement_mock_peut_etre_confirme_par_numero_et_code():
    concours = _concours(code="paiement-api")
    depot = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    numero = depot.data["numero_suivi"]
    code = depot.data["code_suivi"]

    reponse = APIClient().post(
        f"/api/v1/candidatures/{numero}/paiement/confirmer-mock", {"code": code}, format="json"
    )
    assert reponse.status_code == 200
    assert reponse.data["paiement"]["statut"] == "PAYE"

    candidature = Candidature.tous_les_objets.get(numero_suivi=numero)
    assert candidature.paiement().statut == StatutPaiement.PAYE


def test_le_suivi_public_exige_le_numero_et_le_bon_code():
    concours = _concours(code="suivi-api")
    depot = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    numero = depot.data["numero_suivi"]
    code = depot.data["code_suivi"]

    client = APIClient()
    ok = client.get(f"/api/v1/candidatures/{numero}/statut?code={code}")
    assert ok.status_code == 200
    assert ok.data["statut"] == "SOUMISE"

    mauvais_code = client.get(f"/api/v1/candidatures/{numero}/statut?code=000000")
    assert mauvais_code.status_code == 404


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_le_televersement_de_piece_calcule_lempreinte():
    concours = _concours(code="piece-api")
    depot = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    candidature_id = depot.data["id"]

    fichier = SimpleUploadedFile("cv.png", PNG_1X1, content_type="image/png")
    reponse = APIClient().post(
        f"/api/v1/candidatures/{candidature_id}/pieces",
        {"type_piece": "CV", "fichier": fichier},
        format="multipart",
    )
    assert reponse.status_code == 201
    assert reponse.data["empreinte_sha256"]


def test_la_file_dinstruction_est_refusee_sans_authentification():
    reponse = APIClient().get("/api/v1/candidatures/instruction")
    assert reponse.status_code == 401


def test_la_file_dinstruction_est_refusee_tant_que_le_mfa_nest_pas_actif():
    agent = _utilisateur_avec_scopes(
        "agent-sans-mfa-concours@example.sn", "concours:instruire", mfa_active=False
    )
    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.get("/api/v1/candidatures/instruction")
    assert reponse.status_code == 403


def test_la_creation_de_concours_est_refusee_sans_scope_gerer():
    agent = _utilisateur_avec_scopes("agent-sans-scope-concours@example.sn", "concours:instruire")
    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.post(
        "/api/v1/backoffice/concours",
        {"titre": "X", "code": "x", "date_ouverture": "2026-01-01", "date_cloture": "2026-12-31"},
        format="json",
    )
    assert reponse.status_code == 403


def test_le_parcours_instruction_complet_delivre_une_convocation_avec_qr_verifiable():
    concours = _concours(code="instruction-api")
    depot = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    candidature_id = depot.data["id"]

    instructeur = _utilisateur_avec_scopes("instructeur-concours@example.sn", "concours:instruire")
    client = APIClient()
    client.force_authenticate(instructeur)

    for action in ("instruire", "declarer_admissible", "convoquer"):
        reponse = client.post(
            f"/api/v1/candidatures/instruction/{candidature_id}/transition",
            {"action": action},
            format="json",
        )
        assert reponse.status_code == 200, reponse.data

    candidature = Candidature.tous_les_objets.get(pk=candidature_id)
    assert candidature.statut == StatutCandidature.CONVOQUE

    # Rendu via APIRequestFactory (et non APIClient) : le client de test Django
    # instrumente le rendu de template pour `response.context`, ce qui casse sous
    # Python 3.14 (BaseContext.__copy__ sur un objet super()) — bogue de
    # l'environnement de test, sans effet en dehors (vérifié hors test client).
    requete = APIRequestFactory().get(f"/api/v1/convocations/{candidature_id}/pdf")
    force_authenticate(requete, user=instructeur)
    pdf = ConvocationPDFView.as_view()(requete, candidature_id=candidature_id)
    assert pdf.status_code == 200
    assert pdf["Content-Type"] == "application/pdf"

    requete_publique = APIRequestFactory().get(
        f"/api/v1/candidatures/{candidature.numero_suivi}/convocation/pdf?code={candidature.code_suivi}"
    )
    pdf_public = ConvocationPDFParNumeroView.as_view()(
        requete_publique, numero_suivi=candidature.numero_suivi
    )
    assert pdf_public.status_code == 200

    convocation = candidature.convocation
    verification = client.post(
        "/api/v1/convocations/verification", {"jeton": convocation.charge_qr_jws}, format="json"
    )
    assert verification.status_code == 200
    assert verification.data["valide"] is True
    charge_verifiee = verifier_charge(convocation.charge_qr_jws)
    assert charge_verifiee is not None
    assert charge_verifiee["numero_convocation"] == convocation.numero_convocation


def test_une_transition_invalide_renvoie_un_conflit():
    concours = _concours(code="conflit-api")
    depot = APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")
    instructeur = _utilisateur_avec_scopes(
        "instructeur-concours-2@example.sn", "concours:instruire"
    )
    client = APIClient()
    client.force_authenticate(instructeur)

    reponse = client.post(
        f"/api/v1/candidatures/instruction/{depot.data['id']}/transition",
        {"action": "convoquer"},
        format="json",
    )
    assert reponse.status_code == 409


def test_le_renvoi_de_suivi_repond_generiquement_avec_ou_sans_correspondance():
    concours = _concours(code="renvoi-api")
    APIClient().post("/api/v1/candidatures", _charge_depot(concours), format="json")

    client = APIClient()
    avec_correspondance = client.post(
        "/api/v1/candidatures/renvoi", {"email": "awa.ndiaye@example.sn"}, format="json"
    )
    sans_correspondance = client.post(
        "/api/v1/candidatures/renvoi", {"email": "personne@example.sn"}, format="json"
    )

    assert avec_correspondance.status_code == 200
    assert sans_correspondance.status_code == 200
    assert avec_correspondance.data["detail"] == sans_correspondance.data["detail"]
