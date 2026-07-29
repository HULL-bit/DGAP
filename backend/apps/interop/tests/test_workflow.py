import hashlib

import pytest

from apps.interop.models import DirectionEchange, EchangeExterne, StatutEchange, SystemeExterne

pytestmark = pytest.mark.django_db


def test_tracer_calcule_lempreinte_de_la_charge():
    echange = EchangeExterne.tracer(
        systeme=SystemeExterne.TRESOR,
        direction=DirectionEchange.SORTANT,
        type_echange="Rapprochement quotidien",
        statut=StatutEchange.SUCCES,
        charge="contenu de la charge",
    )
    assert echange.empreinte_charge == hashlib.sha256(b"contenu de la charge").hexdigest()


def test_tracer_sans_charge_laisse_lempreinte_vide():
    echange = EchangeExterne.tracer(
        systeme=SystemeExterne.AUTRE,
        direction=DirectionEchange.ENTRANT,
        type_echange="Test",
        statut=StatutEchange.ECHEC,
    )
    assert echange.empreinte_charge == ""


def test_tracer_persiste_le_detail_et_lacteur():
    from apps.comptes.models import Utilisateur

    acteur = Utilisateur.objects.create_user(email="interop@example.sn", mot_de_passe="x")
    echange = EchangeExterne.tracer(
        systeme=SystemeExterne.CHAINE_JUDICIAIRE,
        direction=DirectionEchange.ENTRANT,
        type_echange="Notification d'écrou",
        statut=StatutEchange.SUCCES,
        detail={"reference": "ABC123"},
        acteur=acteur,
    )
    assert echange.detail == {"reference": "ABC123"}
    assert echange.acteur == acteur
