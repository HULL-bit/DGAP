import pytest

from apps.comptes.models import Utilisateur
from apps.contenus.models import Article, StatutContenu, TransitionInvalide

pytestmark = pytest.mark.django_db


def _redacteur() -> Utilisateur:
    return Utilisateur.objects.create_user(
        email="redacteur@example.sn", mot_de_passe="x", est_agent_interne=True
    )


def _valideur() -> Utilisateur:
    return Utilisateur.objects.create_user(
        email="valideur@example.sn", mot_de_passe="x", est_agent_interne=True
    )


def _article(auteur: Utilisateur) -> Article:
    return Article.tous_les_objets.create(  # type: ignore[misc]
        titre="Titre initial",
        slug="titre-initial",
        chapo="Chapo",
        contenu="<p>Contenu</p>",
        cree_par=auteur,
        modifie_par=auteur,
    )


def test_un_nouvel_article_est_en_brouillon_et_invisible_publiquement():
    article = _article(_redacteur())
    assert article.statut == StatutContenu.BROUILLON
    assert not Article.objets.publies().filter(pk=article.pk).exists()


def test_le_parcours_nominal_soumettre_valider_publier_fonctionne():
    redacteur, valideur = _redacteur(), _valideur()
    article = _article(redacteur)

    article.transitionner("soumettre", acteur=redacteur)
    assert article.statut == StatutContenu.RELECTURE

    article.transitionner("valider", acteur=valideur)
    assert article.statut == StatutContenu.VALIDE

    article.transitionner("publier", acteur=valideur)
    assert article.statut == StatutContenu.PUBLIE
    assert article.date_publication is not None
    assert Article.objets.publies().filter(pk=article.pk).exists()


def test_une_transition_hors_matrice_leve_transition_invalide():
    article = _article(_redacteur())
    with pytest.raises(TransitionInvalide):
        article.transitionner("publier")  # brouillon -> publié n'existe pas directement


def test_chaque_transition_cree_une_version_et_lhistorique_est_ordonne():
    redacteur = _redacteur()
    article = _article(redacteur)
    article.creer_version(acteur=redacteur, commentaire="Création")

    article.transitionner("soumettre", acteur=redacteur)

    versions = list(article.versions())
    assert len(versions) == 2
    assert versions[0].numero == 2  # ordering = ["-numero"]
    assert versions[0].instantane["titre"] == "Titre initial"


def test_restaurer_une_version_reapplique_les_champs_et_trace_une_nouvelle_version():
    redacteur = _redacteur()
    article = _article(redacteur)
    version_initiale = article.creer_version(acteur=redacteur, commentaire="Création")

    article.titre = "Titre modifié"
    article.save()
    article.creer_version(acteur=redacteur, commentaire="Modification")

    article.restaurer(version_initiale, acteur=redacteur)

    article.refresh_from_db()
    assert article.titre == "Titre initial"
    assert article.versions().count() == 3


def test_le_journal_de_version_est_append_only():
    article = _article(_redacteur())
    version = article.creer_version(commentaire="Création")

    with pytest.raises(NotImplementedError):
        version.commentaire = "modifié"
        version.save()

    with pytest.raises(NotImplementedError):
        version.delete()
