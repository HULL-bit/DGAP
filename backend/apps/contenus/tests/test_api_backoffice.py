import base64

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Permission, Role, Utilisateur
from apps.contenus.models import Article

pytestmark = pytest.mark.django_db

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
STOCKAGE_LOCAL_TEST = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def _utilisateur_avec_scopes(email: str, *scopes: str) -> Utilisateur:
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


def test_liste_backoffice_refusee_sans_authentification():
    reponse = APIClient().get("/api/v1/backoffice/articles")
    assert reponse.status_code == 401


def test_liste_backoffice_refusee_si_mfa_pas_encore_active():
    """Bootstrap connexion (test_auth.py) != accès aux endpoints sensibles : tant que
    `mfa_active` est faux, `MFAConfirmee` bloque le back-office même avec le bon scope.
    """
    utilisateur = Utilisateur.objects.create_user(
        email="pas-encore-mfa@example.sn",
        mot_de_passe="x",
        est_agent_interne=True,
        mfa_active=False,
    )
    role = Role.objects.create(code="role-pas-encore-mfa", libelle="test")
    permission = Permission.objects.create(
        code="contenus:rediger", libelle="x", categorie="contenus"
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)

    client = APIClient()
    client.force_authenticate(utilisateur)
    reponse = client.get("/api/v1/backoffice/articles")
    assert reponse.status_code == 403


def test_liste_backoffice_refusee_sans_scope_contenus_rediger():
    utilisateur = _utilisateur_avec_scopes("sans-scope@example.sn")
    client = APIClient()
    client.force_authenticate(utilisateur)
    reponse = client.get("/api/v1/backoffice/articles")
    assert reponse.status_code == 403


def test_redacteur_peut_creer_un_article_en_brouillon():
    redacteur = _utilisateur_avec_scopes("redacteur-api@example.sn", "contenus:rediger")
    client = APIClient()
    client.force_authenticate(redacteur)

    reponse = client.post(
        "/api/v1/backoffice/articles",
        {
            "titre": "Nouvel article",
            "slug": "nouvel-article",
            "chapo": "Chapo",
            "contenu": "<p>x</p>",
        },
        format="json",
    )

    assert reponse.status_code == 201
    assert reponse.data["statut"] == "BROUILLON"
    article = Article.tous_les_objets.get(slug="nouvel-article")
    assert article.versions().count() == 1


def test_redacteur_ne_peut_pas_publier_directement():
    redacteur = _utilisateur_avec_scopes("redacteur-api-2@example.sn", "contenus:rediger")
    article = Article.tous_les_objets.create(titre="A", slug="a-publier", contenu="x")
    article.transitionner("soumettre")
    article.transitionner("valider")

    client = APIClient()
    client.force_authenticate(redacteur)
    reponse = client.post(
        f"/api/v1/backoffice/articles/{article.pk}/transition", {"action": "publier"}, format="json"
    )

    assert reponse.status_code == 403


def test_valideur_peut_valider_et_publier_bout_en_bout():
    redacteur = _utilisateur_avec_scopes("redacteur-api-3@example.sn", "contenus:rediger")
    valideur = _utilisateur_avec_scopes(
        "valideur-api@example.sn", "contenus:valider", "contenus:publier"
    )

    client = APIClient()
    client.force_authenticate(redacteur)
    creation = client.post(
        "/api/v1/backoffice/articles",
        {"titre": "Article bout en bout", "slug": "article-bout-en-bout", "contenu": "<p>x</p>"},
        format="json",
    )
    article_id = creation.data["id"]
    client.post(
        f"/api/v1/backoffice/articles/{article_id}/transition",
        {"action": "soumettre"},
        format="json",
    )

    client.force_authenticate(valideur)
    reponse_validation = client.post(
        f"/api/v1/backoffice/articles/{article_id}/transition", {"action": "valider"}, format="json"
    )
    assert reponse_validation.status_code == 200
    assert reponse_validation.data["statut"] == "VALIDE"

    reponse_publication = client.post(
        f"/api/v1/backoffice/articles/{article_id}/transition", {"action": "publier"}, format="json"
    )
    assert reponse_publication.status_code == 200
    assert reponse_publication.data["statut"] == "PUBLIE"

    versions = client.get(f"/api/v1/backoffice/articles/{article_id}/versions")
    assert versions.status_code == 200
    assert len(versions.data) == 4  # création, soumettre, valider, publier

    reponse_publique = APIClient().get("/api/v1/articles/article-bout-en-bout")
    assert reponse_publique.status_code == 200


@override_settings(STORAGES=STOCKAGE_LOCAL_TEST)
def test_le_televersement_de_limage_a_la_une_met_a_jour_image_url():
    redacteur = _utilisateur_avec_scopes("redacteur-image@example.sn", "contenus:rediger")
    article = Article.tous_les_objets.create(titre="Avec image", slug="avec-image", contenu="x")

    client = APIClient()
    client.force_authenticate(redacteur)
    fichier = SimpleUploadedFile("test.png", PNG_1X1, content_type="image/png")
    reponse = client.post(
        f"/api/v1/backoffice/articles/{article.pk}/image", {"image": fichier}, format="multipart"
    )

    assert reponse.status_code == 201
    assert reponse.data["image_url"]

    article.refresh_from_db()
    assert article.image.url == reponse.data["image_url"]
