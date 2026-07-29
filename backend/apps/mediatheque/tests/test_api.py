import base64

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.mediatheque.models import Galerie, MediaGalerie, TypeMedia

pytestmark = pytest.mark.django_db

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

# Les tests d'écriture de fichier utilisent le stockage local plutôt que MinIO/S3 réel
# (config.settings.dev pointe vers S3Storage) : un test unitaire ne doit pas dépendre
# d'un service réseau externe.
STOCKAGE_LOCAL_TEST = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def _redacteur() -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email="redacteur-galerie@example.sn",
        mot_de_passe="x",
        est_agent_interne=True,
        mfa_active=True,
    )
    role = Role.objects.create(code="role-redacteur-galerie", libelle="Rédacteur")
    permission, _ = Permission.objects.get_or_create(
        code="contenus:rediger", defaults={"libelle": "Rédiger", "categorie": "contenus"}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)
    return utilisateur


def _image_televersee(nom: str = "test.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(nom, PNG_1X1, content_type="image/png")


def test_la_galerie_publique_ne_montre_que_les_medias_publies():
    galerie = Galerie.objects.create(code="test-carrousel", titre="Carrousel")
    MediaGalerie.objects.create(
        galerie=galerie,
        type=TypeMedia.VIDEO,
        video_url="https://youtube.com/watch?v=abc",
        publie=True,
    )
    MediaGalerie.objects.create(
        galerie=galerie,
        type=TypeMedia.VIDEO,
        video_url="https://youtube.com/watch?v=cache",
        publie=False,
    )

    reponse = APIClient().get("/api/v1/galeries/test-carrousel")
    assert reponse.status_code == 200
    assert len(reponse.data["medias"]) == 1


def test_la_creation_de_galerie_est_refusee_sans_scope():
    client = APIClient()
    client.force_authenticate(
        Utilisateur.objects.create_user(
            email="sans-scope@example.sn", mot_de_passe="x", est_agent_interne=True, mfa_active=True
        )
    )
    reponse = client.post(
        "/api/v1/backoffice/galeries", {"code": "test", "titre": "Test"}, format="json"
    )
    assert reponse.status_code == 403


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_le_parcours_complet_creation_galerie_et_ajout_de_medias():
    redacteur = _redacteur()
    client = APIClient()
    client.force_authenticate(redacteur)

    creation = client.post(
        "/api/v1/backoffice/galeries",
        {"code": "test-reinsertion-menuiserie", "titre": "Atelier menuiserie", "description": "x"},
        format="json",
    )
    assert creation.status_code == 201
    galerie_id = creation.data["id"]

    ajout_image = client.post(
        f"/api/v1/backoffice/galeries/{galerie_id}/medias",
        {"type": "IMAGE", "image": _image_televersee(), "legende": "Atelier"},
        format="multipart",
    )
    assert ajout_image.status_code == 201, ajout_image.data

    ajout_video = client.post(
        f"/api/v1/backoffice/galeries/{galerie_id}/medias",
        {"type": "VIDEO", "video_url": "https://youtube.com/watch?v=xyz"},
        format="json",
    )
    assert ajout_video.status_code == 201, ajout_video.data

    detail = client.get(f"/api/v1/backoffice/galeries/{galerie_id}")
    assert detail.status_code == 200
    assert len(detail.data["medias"]) == 2

    reponse_publique = APIClient().get("/api/v1/galeries/test-reinsertion-menuiserie")
    assert reponse_publique.status_code == 200
    assert len(reponse_publique.data["medias"]) == 2


def test_un_media_image_sans_fichier_est_rejete():
    redacteur = _redacteur()
    galerie = Galerie.objects.create(code="vide", titre="Vide")
    client = APIClient()
    client.force_authenticate(redacteur)

    reponse = client.post(
        f"/api/v1/backoffice/galeries/{galerie.id}/medias",
        {"type": "IMAGE"},
        format="multipart",
    )
    assert reponse.status_code == 400


def test_un_media_video_sans_lien_est_rejete():
    redacteur = _redacteur()
    galerie = Galerie.objects.create(code="vide-2", titre="Vide 2")
    client = APIClient()
    client.force_authenticate(redacteur)

    reponse = client.post(
        f"/api/v1/backoffice/galeries/{galerie.id}/medias",
        {"type": "VIDEO"},
        format="json",
    )
    assert reponse.status_code == 400
