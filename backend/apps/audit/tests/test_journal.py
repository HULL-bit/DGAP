import pytest

from apps.audit.models import Action, JournalAction

pytestmark = pytest.mark.django_db


def test_tracer_cree_une_ligne_de_journal():
    entree = JournalAction.tracer(
        acteur=None, action=Action.CONSULTER, ressource_type="etablissement", ressource_id="123"
    )
    assert JournalAction.objets.count() == 1
    assert entree.action == Action.CONSULTER


def test_le_journal_est_append_only():
    entree = JournalAction.tracer(
        acteur=None, action=Action.CREER, ressource_type="page", ressource_id="1"
    )

    entree.detail = {"modifie": True}
    with pytest.raises(NotImplementedError):
        entree.save()

    with pytest.raises(NotImplementedError):
        entree.delete()

    with pytest.raises(NotImplementedError):
        JournalAction.objets.all().update(ressource_id="autre")
