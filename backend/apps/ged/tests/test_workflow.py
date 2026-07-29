import io
from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone

from apps.ged.models import Document, LienPartage, NatureDocumentGed, StatutOcr

pytestmark = pytest.mark.django_db

# Les tests d'écriture de fichier utilisent le stockage local plutôt que MinIO/S3 réel
# (config.settings.dev pointe vers S3Storage) : un test unitaire ne doit pas dépendre
# d'un service réseau externe.
STOCKAGE_LOCAL_TEST = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def _image_avec_texte(texte: str, nom: str = "document.png") -> SimpleUploadedFile:
    from PIL import Image, ImageDraw, ImageFont

    police = ImageFont.truetype("/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf", 36)
    image = Image.new("RGB", (600, 80), color="white")
    ImageDraw.Draw(image).text((10, 10), texte, fill="black", font=police)
    tampon = io.BytesIO()
    image.save(tampon, format="PNG")
    return SimpleUploadedFile(nom, tampon.getvalue(), content_type="image/png")


def _document(**overrides) -> Document:
    valeurs = {
        "titre": "Note de service",
        "nature": NatureDocumentGed.ADMINISTRATIF,
        "fichier": _image_avec_texte("BONJOUR MONDE"),
    }
    valeurs.update(overrides)
    return Document.objets.create(**valeurs)


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_traiter_fichier_entrant_calcule_lempreinte_et_locr():
    document = _document()
    document.traiter_fichier_entrant()

    assert len(document.empreinte_sha256) == 64
    assert document.statut_ocr == StatutOcr.TRAITE
    assert "BONJOUR MONDE" in document.contenu_ocr


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_nouvelle_version_archive_lancienne_et_remplace_le_fichier():
    document = _document()
    document.traiter_fichier_entrant()
    document.save()
    empreinte_v1 = document.empreinte_sha256

    document.nouvelle_version(_image_avec_texte("DEUXIEME VERSION"), commentaire="mise à jour")

    assert document.versions.count() == 1
    version = document.versions.get()
    assert version.numero == 1
    assert version.empreinte_sha256 == empreinte_v1
    assert "DEUXIEME VERSION" in document.contenu_ocr
    assert document.empreinte_sha256 != empreinte_v1


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_restaurer_version_cree_une_nouvelle_version_sans_perte():
    document = _document()
    document.traiter_fichier_entrant()
    document.save()

    document.nouvelle_version(_image_avec_texte("DEUXIEME VERSION"))
    premiere_version = document.versions.get(numero=1)

    document.restaurer_version(premiere_version)

    assert document.versions.count() == 2
    assert "BONJOUR MONDE" in document.contenu_ocr


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_verrouiller_puis_deverrouiller():
    from apps.comptes.models import Utilisateur

    document = _document()
    utilisateur = Utilisateur.objects.create_user(email="verrou@example.sn", mot_de_passe="x")

    document.verrouiller(utilisateur)
    document.refresh_from_db()
    assert document.est_verrouille is True
    assert document.verrouille_par == utilisateur

    document.deverrouiller()
    document.refresh_from_db()
    assert document.est_verrouille is False


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_lien_partage_est_expire():
    document = _document()
    lien_actif = LienPartage.objects.create(
        document=document, expire_le=timezone.now() + timedelta(hours=1)
    )
    lien_expire = LienPartage.objects.create(
        document=document, expire_le=timezone.now() - timedelta(hours=1)
    )

    assert lien_actif.est_expire is False
    assert lien_expire.est_expire is True
