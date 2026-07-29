import base64

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from apps.boutique.models import ProduitBoutique
from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur

pytestmark = pytest.mark.django_db

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

# Un test unitaire ne doit pas dépendre d'un service réseau externe (MinIO/S3) :
# config.settings.dev pointe vers S3Storage, on bascule sur le disque local ici.
STOCKAGE_LOCAL_TEST = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def _gestionnaire_boutique() -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email="gestionnaire-boutique@example.sn",
        mot_de_passe="x",
        est_agent_interne=True,
        mfa_active=True,
    )
    role = Role.objects.create(code="role-gestionnaire-boutique", libelle="Gestionnaire boutique")
    permission, _ = Permission.objects.get_or_create(
        code="boutique:gerer", defaults={"libelle": "Gérer la boutique", "categorie": "boutique"}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)
    return utilisateur


def test_la_vitrine_publique_ne_montre_que_les_produits_disponibles():
    ProduitBoutique.objects.create(nom="Visible", slug="visible", prix=1000, disponible=True)
    ProduitBoutique.objects.create(nom="Masqué", slug="masque", prix=1000, disponible=False)

    reponse = APIClient().get("/api/v1/boutique/produits")
    assert reponse.status_code == 200
    noms = [p["nom"] for p in reponse.data["results"]]
    assert noms == ["Visible"]


def test_la_vitrine_publique_filtre_par_categorie():
    ProduitBoutique.objects.create(nom="Jus", slug="jus", categorie="Jus locaux", prix=1300)
    ProduitBoutique.objects.create(nom="Salon", slug="salon", categorie="Mobilier", prix=450000)

    reponse = APIClient().get("/api/v1/boutique/produits?categorie=Mobilier")
    assert reponse.status_code == 200
    noms = [p["nom"] for p in reponse.data["results"]]
    assert noms == ["Salon"]


def test_la_creation_de_produit_est_refusee_sans_scope():
    client = APIClient()
    client.force_authenticate(
        Utilisateur.objects.create_user(
            email="sans-scope-boutique@example.sn",
            mot_de_passe="x",
            est_agent_interne=True,
            mfa_active=True,
        )
    )
    reponse = client.post(
        "/api/v1/backoffice/boutique/produits",
        {"nom": "Test", "slug": "test", "prix": "1000"},
        format="json",
    )
    assert reponse.status_code == 403


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_le_parcours_complet_creation_et_televersement_image():
    gestionnaire = _gestionnaire_boutique()
    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/boutique/produits",
        {
            "nom": "Jus Bissap 1 Litre",
            "slug": "jus-bissap-1l",
            "categorie": "Jus locaux",
            "prix": "1300",
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    produit_id = creation.data["id"]
    assert creation.data["image_url"] == ""

    fichier = SimpleUploadedFile("bissap.png", PNG_1X1, content_type="image/png")
    upload = client.post(
        f"/api/v1/backoffice/boutique/produits/{produit_id}/image",
        {"image": fichier},
        format="multipart",
    )
    assert upload.status_code == 201, upload.data
    assert upload.data["image_url"]

    detail = client.get(f"/api/v1/backoffice/boutique/produits/{produit_id}")
    assert detail.data["image_url"]

    reponse_publique = APIClient().get("/api/v1/boutique/produits")
    assert reponse_publique.data["results"][0]["image_url"]

    suppression = client.delete(f"/api/v1/backoffice/boutique/produits/{produit_id}/image")
    assert suppression.status_code == 200
    assert suppression.data["image_url"] == ""
