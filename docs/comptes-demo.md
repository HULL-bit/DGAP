# Comptes de démonstration

Créés par `scripts/seed.py` (idempotent — relançable via `make seed`). **Mots de passe
de développement uniquement** (§15) : à ne jamais utiliser en production, à faire
tourner avant toute mise en ligne réelle.

Mot de passe commun à tous les comptes : **`DemoDGAP2026!`**

| Compte | Rôle | Interne (MFA) ? | Portée |
|---|---|---|---|
| `demo.citoyen@administrationpenitentiaire.sn` | Citoyen | Non | Démarches publiques |
| `demo.candidat@administrationpenitentiaire.sn` | Candidat concours | Non | Espace candidat (Bloc E) |
| `demo.agent@administrationpenitentiaire.sn` | Agent pénitentiaire | Oui | Intranet — lecture (Bloc F) |
| `demo.chef-etablissement@administrationpenitentiaire.sn` | Chef d'établissement | Oui | Instruction visites (`visites:instruire/controler`) + intranet (`intranet:consulter/publier`) |
| `demo.redacteur@administrationpenitentiaire.sn` | Rédacteur éditorial | Oui | `contenus:rediger` + `documents:gerer` + `boutique:gerer` — back-office |
| `demo.valideur@administrationpenitentiaire.sn` | Valideur éditorial | Oui | `contenus:rediger` + `contenus:valider` — back-office |
| `demo.administrateur@administrationpenitentiaire.sn` | Administrateur | Oui | `est_superviseur_national` (tous les droits, cf. §Décisions d'architecture) |

## Comment se connecter

### Comptes publics (citoyen, candidat) — `demarches.localhost`

Pas de MFA : email + mot de passe suffisent.

### Comptes internes (agent, chef-etablissement, redacteur, valideur, administrateur) — `admin.localhost` ou `intranet.localhost`

Le MFA (TOTP) est **obligatoire** mais suit un parcours de *bootstrap* en deux temps :

1. **Première connexion** : email + mot de passe seuls suffisent (aucun code demandé).
   Le jeton obtenu à ce stade ne donne accès qu'à `/auth/moi` et à l'écran d'activation
   MFA — aucun endpoint métier n'est accessible tant que l'étape 2 n'est pas faite
   (`core.permissions.MFAConfirmee`).
2. **Écran « Activer la double authentification »** (redirection automatique) :
   - Scanner le QR code avec une application d'authentification (Google
     Authenticator, Authy, Microsoft Authenticator, ou l'app native « Mots de passe »
     sur iPhone/iOS 15+ via « Configurer le code de vérification »).
   - Entrer le code à 6 chiffres affiché, cliquer « Activer ».
   - Recharger cette page avant de valider ne pose pas de problème : l'inscription
     est idempotente tant qu'elle n'est pas confirmée (`InscriptionMFAView`), le même
     secret est réutilisé plutôt que régénéré.
3. **Connexions suivantes** : email + mot de passe + code TOTP courant, à chaque fois.
   « Le code ne marche pas » vient presque toujours d'un code réutilisé (refusé par
   sécurité, un code ne sert qu'une fois) ou d'échecs rapprochés qui déclenchent une
   pause croissante (`django_otp` : 1 s, 2 s, 4 s...) — voir
   [`guide-mfa-agents.md`](guide-mfa-agents.md) pour l'explication complète destinée
   aux agents.

### Réinitialiser le MFA d'un compte de démo (si besoin, en dev uniquement)

```bash
docker compose exec backend python manage.py shell -c "
from apps.comptes.models import Utilisateur
from django_otp.plugins.otp_totp.models import TOTPDevice
u = Utilisateur.objects.get(email='demo.redacteur@administrationpenitentiaire.sn')
TOTPDevice.objects.filter(user=u).delete()
u.mfa_active = False
u.save(update_fields=['mfa_active'])
"
```
