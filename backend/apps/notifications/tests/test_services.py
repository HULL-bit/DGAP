import pytest
from django.core import mail

from apps.notifications.models import CanalNotification, Notification, StatutNotification
from apps.notifications.services import notifier, notifier_email, notifier_sms

pytestmark = pytest.mark.django_db


def test_notifier_email_envoie_reellement_et_journalise():
    notification = notifier_email("citoyen@example.sn", "Sujet", "Corps du message")

    assert notification.canal == CanalNotification.EMAIL
    assert notification.statut == StatutNotification.ENVOYE
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["citoyen@example.sn"]
    assert mail.outbox[0].subject == "Sujet"


def test_notifier_sms_est_simule_et_journalise_sans_envoi_reel():
    notification = notifier_sms("+221770000000", "Corps du SMS")

    assert notification.canal == CanalNotification.SMS
    assert notification.statut == StatutNotification.ENVOYE
    assert len(mail.outbox) == 0


def test_notifier_envoie_sur_tous_les_canaux_disponibles():
    notifications = notifier(
        email="citoyen@example.sn", telephone="+221770000000", sujet="Sujet", contenu="Corps"
    )

    assert len(notifications) == 2
    assert {n.canal for n in notifications} == {CanalNotification.EMAIL, CanalNotification.SMS}
    assert Notification.objects.count() == 2


def test_notifier_ignore_les_canaux_sans_destinataire():
    notifications = notifier(email="citoyen@example.sn", sujet="Sujet", contenu="Corps")

    assert len(notifications) == 1
    assert notifications[0].canal == CanalNotification.EMAIL
