import io

import pytest
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit.models import JournalAction
from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur

pytestmark = pytest.mark.django_db

# Les tests d'écriture de fichier utilisent le stockage local plutôt que MinIO/S3 réel
# (config.settings.dev pointe vers S3Storage) : un test unitaire ne doit pas dépendre
# d'un service réseau externe.
STOCKAGE_LOCAL_TEST = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


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


def _image_avec_texte(texte: str, nom: str = "document.png"):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image, ImageDraw, ImageFont

    police = ImageFont.truetype("/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf", 36)
    image = Image.new("RGB", (600, 80), color="white")
    ImageDraw.Draw(image).text((10, 10), texte, fill="black", font=police)
    tampon = io.BytesIO()
    image.save(tampon, format="PNG")
    return SimpleUploadedFile(nom, tampon.getvalue(), content_type="image/png")


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_la_creation_est_refusee_sans_scope():
    client = APIClient()
    client.force_authenticate(_agent_avec_scopes("sans-scope-ged@example.sn"))
    reponse = client.post(
        "/api/v1/backoffice/ged/documents",
        {"titre": "x", "nature": "ADMINISTRATIF", "fichier": _image_avec_texte("X")},
        format="multipart",
    )
    assert reponse.status_code == 403


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_le_parcours_complet_creation_ocr_version_et_verrouillage():
    gestionnaire = _agent_avec_scopes("gestionnaire-ged@example.sn", "ged:gerer")
    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/ged/documents",
        {
            "titre": "Note de service",
            "nature": "ADMINISTRATIF",
            "fichier": _image_avec_texte("BONJOUR MONDE"),
        },
        format="multipart",
    )
    assert creation.status_code == 201, creation.data
    document_id = creation.data["id"]

    detail = client.get(f"/api/v1/backoffice/ged/documents/{document_id}")
    assert detail.status_code == 200
    assert len(detail.data["empreinte_sha256"]) == 64
    assert detail.data["statut_ocr"] == "TRAITE"
    assert "BONJOUR MONDE" in detail.data["contenu_ocr"]

    nouvelle_version = client.post(
        f"/api/v1/backoffice/ged/documents/{document_id}/versions",
        {"fichier": _image_avec_texte("DEUXIEME VERSION"), "commentaire": "mise à jour"},
        format="multipart",
    )
    assert nouvelle_version.status_code == 201, nouvelle_version.data
    assert len(nouvelle_version.data["versions"]) == 1
    assert "DEUXIEME VERSION" in nouvelle_version.data["contenu_ocr"]

    restauration = client.post(
        f"/api/v1/backoffice/ged/documents/{document_id}/versions/1/restaurer"
    )
    assert restauration.status_code == 200
    assert "BONJOUR MONDE" in restauration.data["contenu_ocr"]

    verrouillage = client.post(f"/api/v1/backoffice/ged/documents/{document_id}/verrouillage")
    assert verrouillage.status_code == 200
    assert verrouillage.data["est_verrouille"] is True

    autre_gestionnaire = _agent_avec_scopes("autre-gestionnaire-ged@example.sn", "ged:gerer")
    autre_client = APIClient()
    autre_client.force_authenticate(autre_gestionnaire)

    conflit = autre_client.post(f"/api/v1/backoffice/ged/documents/{document_id}/verrouillage")
    assert conflit.status_code == 409

    refus_deverrouillage = autre_client.delete(
        f"/api/v1/backoffice/ged/documents/{document_id}/verrouillage"
    )
    assert refus_deverrouillage.status_code == 403

    deverrouillage = client.delete(f"/api/v1/backoffice/ged/documents/{document_id}/verrouillage")
    assert deverrouillage.status_code == 200
    assert deverrouillage.data["est_verrouille"] is False


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_lien_de_partage_expire_et_journalise_la_consultation():
    gestionnaire = _agent_avec_scopes(
        "gestionnaire-partage-ged@example.sn", "ged:gerer", "ged:consulter"
    )
    client = APIClient()
    client.force_authenticate(gestionnaire)

    creation = client.post(
        "/api/v1/backoffice/ged/documents",
        {
            "titre": "Rapport",
            "nature": "ADMINISTRATIF",
            "fichier": _image_avec_texte("RAPPORT ANNUEL"),
        },
        format="multipart",
    )
    document_id = creation.data["id"]

    lien = client.post(
        f"/api/v1/backoffice/ged/documents/{document_id}/partage",
        {"duree_heures": 1},
        format="json",
    )
    assert lien.status_code == 201
    jeton = lien.data["jeton"]

    avant = JournalAction.objets.count()
    telechargement = client.get(f"/api/v1/backoffice/ged/partage/{jeton}")
    assert telechargement.status_code == 200
    assert JournalAction.objets.count() == avant + 1

    from apps.ged.models import LienPartage

    LienPartage.objects.filter(jeton=jeton).update(expire_le=timezone.now())
    expire = client.get(f"/api/v1/backoffice/ged/partage/{jeton}")
    assert expire.status_code == 410
