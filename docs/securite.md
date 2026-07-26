# Sécurité

Référence : chapitre sécurité du Cahier des charges DGAP-SI-CDC-2026-001 (§6.3, §9.3).
Ce document décrit ce qui est **réellement implémenté** en Phase 0 et ce qui reste à
faire, module par module.

## RBAC — rôles, permissions, périmètres

Voir `backend/apps/comptes/README.md` pour le détail. Résumé :

- Moindre privilège : un utilisateur n'a que les permissions accordées explicitement
  (par rôle ou par attribution directe), jamais par défaut.
- Séparation des tâches : les actions sensibles (validation de dossier, publication)
  doivent être réservées à des permissions distinctes de la saisie — à appliquer au
  niveau des vues DRF (`core.permissions.PossedeScope`) quand ces modules seront
  construits (Bloc D+).
- Cloisonnement par périmètre : `core.permissions.RespectePerimetre` vérifie que le
  périmètre de l'objet consulté fait partie des périmètres autorisés de l'acteur, sauf
  `est_superviseur_national=True`. **Test de recette CR-S-07** (accès inter-
  établissement refusé + journalisé) à écrire dès qu'une première ressource
  cloisonnée existe (Bloc D — visites).

## Authentification

- Comptes nominatifs par e-mail (`apps.comptes.Utilisateur`), jamais de compte
  générique.
- Mots de passe ≥ 12 caractères, validateurs Django standard (similarité, mots de
  passe communs, tout numérique) — voir `AUTH_PASSWORD_VALIDATORS` dans
  `backend/config/settings/base.py`.
- **MFA TOTP obligatoire** pour tout compte `est_agent_interne=True`
  (`apps.comptes.serializers.ConnexionSerializer` refuse la connexion tant que
  `mfa_active` n'est pas vrai). Endpoints d'inscription/confirmation :
  `POST /api/v1/auth/mfa/inscription`, `POST /api/v1/auth/mfa/confirmation`.
- Verrouillage progressif (`django-axes`) : 5 échecs par combinaison
  utilisateur+IP → blocage 15 minutes (§`AXES_FAILURE_LIMIT`,
  `AXES_LOCKOUT_PARAMETERS` dans `base.py`).
- JWT courte durée (`djangorestframework-simplejwt`) : accès 15 min, rafraîchissement
  1 jour avec rotation + liste noire après rotation.
- **OIDC-ready** : le point d'extension pour un SSO Keycloak (profil `full` du
  docker-compose) n'est pas encore câblé côté Django — à faire quand l'intranet aura
  un vrai besoin de SSO inter-applications (Bloc F).

## Cloisonnement des zones

- 4 sous-domaines, 4 blocs Nginx distincts (`nginx/conf.d/`), CORS explicite par
  origine (jamais de joker en production), en-têtes `X-Robots-Tag: noindex` sur
  `intranet`/`admin`.
- Cookies de session : la configuration `SESSION_COOKIE_SAMESITE=Strict` +
  `proxy_cookie_path` par bloc Nginx isole les cookies par zone. **Non encore
  vérifié par un test automatisé** — à ajouter au Bloc D (premier flux avec session
  réellement utilisée côté navigateur).
- `apps.detenus` (M10) n'existe qu'en scaffolding (`apps.py`, pas de modèle) et n'est
  **pas** dans `INSTALLED_APPS` : aucune route, aucune table, donc aucune surface
  d'exposition tant que le Bloc G n'est pas engagé.

## Journal d'audit

`apps.audit.JournalAction` — append-only (voir `backend/apps/audit/README.md`).
`JournalAction.tracer(...)` est appelé sur les événements de sécurité déjà en place
(connexion réussie, activation MFA). **Reste à faire** : traçage systématique des
consultations sensibles et des refus d'accès (`ACCES_REFUSE`), alerte automatique
au-delà d'un seuil de tentatives atypiques (§ prévu, non implémenté).

## En-têtes HTTP (Nginx)

Voir `nginx/snippets/securite-headers.conf` (HSTS, nosniff, Referrer-Policy,
Permissions-Policy, X-Frame-Options) et les CSP par zone dans chaque
`nginx/conf.d/*.conf`. TLS local : certificat auto-signé généré par `make certs`
(`nginx/snippets/ssl-dev.conf`) — **en production, remplacer par un certificat
ACME/Let's Encrypt** (non couvert par ce dépôt, à documenter dans
`docs/exploitation.md` lors du déploiement réel).

## Ce qui reste à couvrir (hors Phase 0)

- Chiffrement applicatif des champs sensibles (`detenus`, santé) — AES-256-GCM, clés
  hors base : Bloc G.
- Antivirus (ClamAV) sur téléversements : Bloc D (premier module avec upload réel).
- OWASP ASVS niveau 2 (niveau 3 pour `detenus`) : revue formelle à mener une fois les
  modules concernés construits, pas sur un scaffold vide.
- Scan de dépendances (`pip-audit`, `npm audit`) et d'images (Trivy) : câblés en CI
  (voir `.github/workflows/ci.yml`), à surveiller en continu.
