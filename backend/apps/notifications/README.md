# apps.notifications

Notifications SMS/e-mail (EF-1405) — hookées depuis `apps.visites` et
`apps.concours` (EF-302 : notification à chaque changement d'état).

Livré : `Notification` (journal générique, relation vers l'objet source),
`services.notifier()` (point d'entrée unique, échec d'envoi jamais bloquant),
`GET /api/v1/backoffice/notifications` (visibilité, scope `notifications:lire`).

E-mail réel (SMTP, MailHog en dev). **SMS simulé** : aucun connecteur opérateur/
agrégateur sénégalais réel n'est engagé (décision produit, même principe que
`apps.paiements` — pas de service tiers non validé, §4.2) ; journalisé comme envoyé,
jamais transmis.

Non couvert : file de réémission automatique en cas d'échec (EF-1405 le mentionne,
purement visibilité ici), agrégateur SMS réel (suppose un contrat opérateur).
