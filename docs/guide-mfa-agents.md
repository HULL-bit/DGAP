# Guide : la double authentification (MFA) pour les agents

Ce guide s'adresse aux agents, chefs d'établissement, rédacteurs et à toute
personne possédant un **compte interne** (back-office `admin.localhost` ou
intranet `intranet.localhost`). Il explique pas à pas l'activation et
l'utilisation du code à 6 chiffres, et surtout **pourquoi ça semble parfois ne
pas marcher** — ce n'est presque toujours pas une panne.

## Pourquoi un code en plus du mot de passe ?

Un compte interne donne accès à des données sensibles (dossiers de détenus,
courrier, comptes...). Le mot de passe seul peut être deviné, volé ou
réutilisé ailleurs ; le code à 6 chiffres, lui, change toutes les 30 secondes
et n'existe que sur votre téléphone. Même si quelqu'un connaît votre mot de
passe, il ne peut pas se connecter sans ce code.

## Étape 1 — Installer une application d'authentification

Sur votre téléphone (une seule fois, avant la première connexion) :

- **Android** : Google Authenticator, Microsoft Authenticator, ou Authy.
- **iPhone (iOS 15+)** : l'app native **Mots de passe** (réglage « Configurer
  le code de vérification ») fonctionne aussi, sans rien installer.

## Étape 2 — Première connexion et activation

1. Connectez-vous avec votre e-mail professionnel et le mot de passe que
   l'administrateur vous a communiqué.
2. Vous arrivez automatiquement sur l'écran **« Activer la double
   authentification »** — c'est normal, aucun autre écran n'est accessible
   tant que ce n'est pas fait.
3. Ouvrez votre application d'authentification, scannez le QR code affiché
   (ou saisissez la clé manuellement via « Saisie manuelle » si le scan ne
   fonctionne pas — appareil photo bloqué, par exemple).
4. Un code à 6 chiffres apparaît dans l'application. Saisissez-le dans le
   champ « Code à 6 chiffres » et cliquez sur **Activer**.

Vous pouvez recharger cette page ou y revenir plus tard sans problème avant
de valider : le même QR code reste utilisable, il n'est pas nécessaire de le
rescanner à chaque fois.

## Étape 3 — Connexions suivantes

À chaque connexion : e-mail + mot de passe + le code affiché **à cet
instant** dans l'application sur votre téléphone.

## « Le code ne marche pas » — les 3 causes réelles

Ce message revient souvent alors que la double authentification fonctionne
correctement. Voici ce qui se passe presque à chaque fois :

### 1. Vous avez réessayé avec le même code

L'application affiche le **même** code pendant 30 secondes. Si une
connexion échoue (mauvais mot de passe tapé en même temps, page rechargée
trop vite...) et que vous recliquez immédiatement en laissant le même code
à l'écran, il sera **refusé même s'il est correct** : un code ne peut
servir qu'une seule fois, par sécurité (cela empêche quelqu'un qui aurait
intercepté un code de s'en resservir).

**→ Attendez que le code change sur votre téléphone avant de réessayer.**
Une barre de progression ou un chiffre indique généralement le temps
restant dans l'application.

### 2. Plusieurs échecs d'affilée déclenchent une pause qui s'allonge

Après un code refusé, une courte pause est imposée avant le prochain essai
(1 s, puis 2 s, 4 s, 8 s... à chaque nouvel échec). Si vous retapez très
vite plusieurs fois de suite, chaque tentative pendant la pause est
refusée — **même avec un code par ailleurs valide** — ce qui donne
l'impression que rien ne fonctionne alors qu'il suffit de patienter
quelques secondes de plus entre deux essais.

**→ Après un échec, attendez au moins une dizaine de secondes, avec un
nouveau code, avant de retenter.**

### 3. L'heure du téléphone n'est pas à jour

Le code dépend de l'heure exacte. Si le téléphone a une horloge décalée
(mode avion prolongé, fuseau horaire mal réglé...), les codes générés ne
correspondent à aucune fenêtre acceptée côté serveur.

**→ Vérifiez que la date et l'heure de votre téléphone sont réglées
automatiquement (« Régler automatiquement », pas manuellement).**

## Vous avez perdu votre téléphone ou changé d'appareil

Contactez votre administrateur : la réinitialisation du MFA d'un compte
demande aujourd'hui une intervention technique côté serveur (pas encore
d'action en un clic dans la console Comptes) — comptez qu'il faille passer
par le support pour la remettre à zéro avant de pouvoir la réactiver sur le
nouvel appareil.
