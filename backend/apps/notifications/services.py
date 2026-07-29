"""Point d'entrée unique pour l'envoi de notifications (EF-302, EF-1405) — un échec
d'envoi ne doit jamais faire échouer la transition métier qui le déclenche."""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.db.models import Model

from .models import CanalNotification, Notification, StatutNotification

logger = logging.getLogger(__name__)


def _references(objet_source: Model | None) -> dict:
    if objet_source is None:
        return {}
    return {
        "content_type": ContentType.objects.get_for_model(objet_source),
        "object_id": objet_source.pk,
    }


def notifier_email(
    destinataire: str, sujet: str, contenu: str, objet_source: Model | None = None
) -> Notification:
    notification = Notification.objects.create(
        canal=CanalNotification.EMAIL,
        destinataire=destinataire,
        sujet=sujet,
        contenu=contenu,
        statut=StatutNotification.ENVOYE,
        **_references(objet_source),
    )
    try:
        send_mail(
            subject=sujet,
            message=contenu,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[destinataire],
            fail_silently=False,
        )
    except Exception:
        logger.warning("Échec d'envoi e-mail à %s", destinataire, exc_info=True)
        notification.statut = StatutNotification.ECHEC
        notification.save(update_fields=["statut"])
    return notification


def notifier_sms(
    destinataire: str, contenu: str, objet_source: Model | None = None
) -> Notification:
    """Simulé — voir le docstring du module. Journalisé comme envoyé, jamais
    transmis à un agrégateur SMS réel."""
    return Notification.objects.create(
        canal=CanalNotification.SMS,
        destinataire=destinataire,
        contenu=contenu,
        statut=StatutNotification.ENVOYE,
        **_references(objet_source),
    )


def notifier(
    *,
    email: str = "",
    telephone: str = "",
    sujet: str,
    contenu: str,
    objet_source: Model | None = None,
) -> list[Notification]:
    """Envoie sur tous les canaux disponibles pour le destinataire (EF-302 : SMS et
    e-mail à chaque changement d'état)."""
    notifications = []
    if email:
        notifications.append(notifier_email(email, sujet, contenu, objet_source))
    if telephone:
        notifications.append(notifier_sms(telephone, contenu, objet_source))
    return notifications
