# 🏗️ Architecture du projet DGAP Sénégal — Guide complet

> Ce document explique **comment le projet est organisé**, **les 4 applications front**, **le backend**, et **comment tout communique ensemble**.

---

## 📊 Vue d'ensemble du système

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                    UTILISATEURS (Internet public + VPN État)                   │
└─────────────┬──────────────────────────────────────────────────────┬───────────┘
              │                                                      │
              │ HTTPS/TLS 1.3 (certificats Let's Encrypt)            │
              │                                                      │
    ┌─────────▼──────────────┐                          ┌───────────▼──────────┐
    │   PUBLIC (ouvert)      │                          │  INTRANET (VPN)      │
    │                        │                          │  + MFA obligatoire   │
    ├────────────────────────┤                          ├──────────────────────┤
    │ ► www.…   (Portail)    │                          │ ► intranet.…         │
    │ ► demarches.…          │                          │ ► admin.…            │
    │   (Démarches)          │                          │   (Backoffice)       │
    └──────────┬─────────────┘                          └──────────┬───────────┘
               │                                                   │
               └──────────────────────────┬──────────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │         NGINX (Reverse Proxy)             │
                    │  • TLS termination                        │
                    │  • Rate limiting                          │
                    │  • En-têtes de sécurité (CSP, HSTS, etc)  │
                    │  • Routage par sous-domaine               │
                    │  • Sessions cloisonnées par zone           │
                    └──────────────────┬──────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
    ┌─────────▼─────────┐  ┌───────────▼────────┐  ┌──────────▼──────┐
    │   API Backend     │  │  Statics (Front)   │  │  Storybook      │
    │   /api/v1/*       │  │  /                 │  │  /components/   │
    │                   │  │                    │  │                 │
    │ Django + DRF      │  │ 4 React SPAs :     │  │ Design System   │
    │ • Auth (JWT+MFA)  │  │  • portail/dist    │  │ (Composants)    │
    │ • RBAC + Audit    │  │  • demarches/dist  │  │                 │
    │ • Métier (9 apps) │  │  • intranet/dist   │  │                 │
    │ • OpenAPI 3.1     │  │  • backoffice/dist │  │                 │
    └─────────┬─────────┘  └────────────────────┘  └─────────────────┘
              │
              │ PostgreSQL 16, Redis (cache/sessions), Celery tasks
              │
    ┌─────────▼───────────────────────────────────────────────┐
    │             SERVICES DE SUPPORT                         │
    ├─────────────────────────────────────────────────────────┤
    │ ► PostgreSQL (données métier + audit append-only)       │
    │ ► Redis (cache, sessions, file Celery)                  │
    │ ► Celery Workers (async : email, SMS, OCR, PDF)        │
    │ ► Celery Beat (tâches planifiées)                       │
    │ ► MinIO / S3 (stockage médias et documents)             │
    │ ► Elasticsearch (search/facettes, optionnel)            │
    │ ► Mailhog (dev : preview email)                        │
    │ ► Keycloak (optionnel : SSO/OIDC)                      │
    └─────────────────────────────────────────────────────────┘
```

---

## 🌐 Les 4 Applications Frontend

### Vue synoptique

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MONOREPO FRONTEND (pnpm workspaces)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PACKAGES PARTAGÉS (Design System + Tooling) :                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ • @dgap/ui          — Composants réutilisables (Button, Card, etc)  │  │
│  │ • @dgap/api-client  — Client TypeScript généré depuis OpenAPI       │  │
│  │ • @dgap/config      — Tailwind preset + eslint + tsconfig           │  │
│  │ • @dgap/i18n        — Dictionnaires français (+ autres langues)     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  APPLICATIONS (4 sites indépendants, même charte) :                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PORTAIL     │  │ DEMARCHES    │  │ INTRANET     │  │ BACKOFFICE   │  │
│  │ www.…        │  │ demarches.…  │  │ intranet.…   │  │ admin.…      │  │
│  │              │  │              │  │              │  │              │  │
│  │ React+Vite   │  │ React+Vite   │  │ React+Vite   │  │ React+Vite   │  │
│  │ SSG/prerender│  │ SPA          │  │ SPA          │  │ SPA          │  │
│  │ (SEO)        │  │ (transactio) │  │ (RH+comms)   │  │ (éditorial)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **App 1 : Portail** (`www.administrationpenitentiaire.sn`)

**Rôle :** Vitrine publique, point d'entrée unique

| Aspect | Détail |
|--------|--------|
| **URL** | `https://www.administrationpenitentiaire.sn` |
| **Accès** | Public (sans authentification) |
| **Audience** | Citoyens, médias, partenaires, chercheurs |
| **Technologie** | React + Vite + TypeScript (SSG/prerender pour SEO) |
| **Performance** | LCP ≤ 2.5s, INP ≤ 200ms, ≤ 1 Mo initial |

**Pages & contenu :**
```
Accueil
├─ Bandeau héro (avec vidéo institutionnelle muette, optionnel)
├─ 4 cartes d'action (liens vers demarches.…)
├─ Mot du Directeur Général
├─ Chiffres clés (13 établissements, 8 500+ détenus, 2 400+ agents)
├─ Actualités récentes (3–5 articles)
└─ Appel à l'action : "Découvrez les ateliers"

À propos
├─ Historique de l'administration
├─ Missions et vision
├─ Organigramme (Services centraux, Régionaux)
└─ Directeurs (DG, services centraux, ENAP)

Établissements (Annuaire)
├─ Liste complète (13 + régionaux)
├─ Fiche par établissement
│  ├─ Localisation (Google Maps via MapLibre)
│  ├─ Coordonnées et horaires
│  ├─ Type de structures (maison d'arrêt, prison, etc)
│  └─ Photos
└─ Recherche/filtre (type, région)

Actualités
├─ Liste paginée (blog)
├─ Fiche complète par article
├─ Archivage par mois/année
└─ Partage social (Facebook, Twitter)

Réinsertion
├─ Présentation des ateliers (7 catégories)
├─ Fiche par atelier (description, résultats)
├─ Histoires de réinsertion (témoignages)
└─ Partenariats

Boutique (optionnel, vitrine)
├─ Produits d'artisanat (7 catégories)
├─ Achat en ligne (redirection paiement)
└─ Conditions

FAQ
├─ Questions fréquentes par catégorie
│  ├─ Visites
│  ├─ Concours
│  ├─ Établissements
│  └─ Général
└─ Recherche

Mentions légales
├─ Politique de confidentialité (RGPD/loi 2008-12)
├─ Accessibilité (RGAA 4)
└─ Données personnelles

Contact
└─ Formulaire de contact (mail → backend)
```

**Données :**
- Principalement éditorialisées (CMS → backoffice)
- Annuaire d'établissements (provenant de la DB, lecture seule)
- Actualités (depuis la DB)
- Contenu statique (à-propos, mentions légales)

**Interactions API :**
```
GET  /api/v1/public/establishments/    (annuaire)
GET  /api/v1/public/news/              (actualités)
GET  /api/v1/public/faq/               (FAQ)
GET  /api/v1/public/pages/{slug}/      (à-propos, mentions, etc)
POST /api/v1/public/contact/           (formulaire contact)
```

**Déploiement :** Static site (build une fois, servi par Nginx)

---

### **App 2 : Démarches** (`demarches.administrationpenitentiaire.sn`)

**Rôle :** Plateforme transactionnelle (dépôts, suivi, paiement)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://demarches.administrationpenitentiaire.sn` |
| **Accès** | Libre (semi-anonyme pour dépôt) + authentification pour suivi |
| **Audience** | Citoyens déposant, candidats concours |
| **Technologie** | React + Vite + TypeScript (SPA) |
| **Performance** | Priorité au chargement rapide des formulaires |

**Fonctionnalités :**
```
Accueil
├─ Sélection de la démarche
│  ├─ Demander une visite (M3)
│  ├─ S'inscrire à un concours (M4)
│  └─ Suivre une demande (suivi par n°)
└─ Aide & FAQ démarches

Démarche : Demande de visite
├─ Formulaire multi-étapes (5 étapes)
│  ├─ Étape 1 : Identité du demandeur (nom, prénom, email, téléphone)
│  ├─ Étape 2 : Visite (établissement, détenu, lien parenté, dates)
│  ├─ Étape 3 : Pièces justificatives (upload PDF/JPG)
│  ├─ Étape 4 : Vérification (résumé + captcha)
│  └─ Étape 5 : Confirmation + numéro de suivi (DGAP-VIS-AAAA-XXXXXX)
├─ Enregistrement en brouillon (possibility de revenir)
├─ Notifications (email/SMS de confirmation)
└─ Génération du permis (après instruction)

Démarche : Concours
├─ Liste des concours ouverts
│  ├─ Avis (texte, PDF)
│  ├─ Calendrier (dates dépôt, résultats, concours)
│  └─ CTA : "S'inscrire"
├─ Formulaire multi-étapes
│  ├─ Étape 1 : Identité
│  ├─ Étape 2 : Situation (études, expérience)
│  ├─ Étape 3 : Pièces (CV, diplômes, attestations)
│  ├─ Étape 4 : Paiement (mock ou vrai : Orange Money, Wave)
│  └─ Étape 5 : Confirmation + reçu de paiement + n° enregistrement (CONC-AAAA-CC-XXXXXX)
├─ Espace candidat (après inscription)
│  ├─ Status de la candidature
│  ├─ Téléchargement de la convocation
│  ├─ Consultation des résultats
│  └─ Dossier de l'étudiant
└─ Timeline : inscription → vérification → admissibilité → convocation → admis/rejeté

Suivi de demande
├─ Entrée : numéro suivi + code vérification
├─ Affichage de l'état (brouillon, soumis, en instruction, validée, rejetée)
├─ Timeline complète (historique)
├─ Téléchargement des permis/documents (PDF avec QR Code)
└─ Notification de changement d'état (email/SMS)

Compte candidat (optionnel, pour multi-demandes)
├─ Authentification (email + mot de passe)
├─ Mes demandes (liste)
├─ Mes concours (statuts)
└─ Profil (coordonnées, pièces communes)
```

**Données :**
- Données transactionnelles (demandes, candidatures)
- Formulaires validés côté client (React Hook Form + Zod)
- États de progression (workflow)
- Fichiers uploadés (stockés sur MinIO/S3)

**Interactions API :**
```
POST   /api/v1/demarches/visits/          (soumettre demande visite)
GET    /api/v1/demarches/visits/{id}/     (récupérer demande)
PUT    /api/v1/demarches/visits/{id}/     (modifier brouillon)
GET    /api/v1/demarches/visits/{id}/pdf/ (générer PDF permis)

POST   /api/v1/demarches/contests/        (soumettre candidature concours)
GET    /api/v1/demarches/contests/open/   (lister concours ouverts)
POST   /api/v1/demarches/payments/        (initier paiement)
GET    /api/v1/demarches/payments/{id}/   (vérifier paiement)

GET    /api/v1/demarches/tracking/{ref}/  (suivi par numéro)
```

**Sécurité :**
- Rate limiting sur les dépôts (ex. 5 dépôts/jour/IP)
- Captcha (Google reCAPTCHA v3)
- Validation des fichiers (MIME type, taille max)
- Chiffrement des données sensibles (email, téléphone)
- Sessions sécurisées (HttpOnly + Secure + SameSite cookies)

**Déploiement :** SPA (React bundle + assets statiques)

---

### **App 3 : Intranet** (`intranet.administrationpenitentiaire.sn`)

**Rôle :** Espace de travail des agents pénitentiaires

| Aspect | Détail |
|--------|--------|
| **URL** | `https://intranet.administrationpenitentiaire.sn` |
| **Accès** | VPN d'État + MFA obligatoire |
| **Audience** | Agents pénitentiaires (2 400+) |
| **Technologie** | React + Vite + TypeScript (SPA) |
| **Performance** | Standard (< 3s sur intranet) |

**Fonctionnalités :**
```
Accueil / Dashboard
├─ Bienvenue personnalisée
├─ Annonces importantes
├─ Raccourcis vers modules clés
└─ Widget : Mes demandes en attente (congés, etc)

Notes de service & Circulaires
├─ Flux (dernier 30 jours)
├─ Archive par date/auteur/type
├─ Marquage lu/non-lu
├─ Téléchargement (PDF)
└─ Commentaires (optionnel)

Gestion du personnel (RH)
├─ Mon profil (données personnelles)
│  ├─ Foto, établissement, fonction, grade
│  ├─ Historique (affectations, promotions)
│  └─ Données de paie (optionnel)
├─ Mes congés
│  ├─ Solde annuel
│  ├─ Demande de congés (formulaire)
│  ├─ État des demandes
│  └─ Historique (années précédentes)
├─ Mon établissement
│  ├─ Annuaire agents (du site)
│  ├─ Organigramme local
│  └─ Contacts importants
└─ Formations disponibles (ENAP)

Annuaire interne
├─ Recherche d'agent (par nom, fonction)
├─ Fiche agent (nom, grade, affectation, téléphone)
├─ Organigramme hiérarchique par région
└─ Groupes de distribution (pour emails)

Modules métier (M5-M11, au besoin agents)
├─ Gestion du courrier (GEC)
│  ├─ Courriers reçus (avec n° de chronologie)
│  ├─ Affectation/circulation
│  └─ Historique
├─ Gestion documentaire (GED)
│  ├─ Partage de documents
│  ├─ Recherche par OCR
│  ├─ Versioning
│  └─ Signature numérique
└─ Statistiques (consultation)
   ├─ Dashboard BI (nombre détenus, admissions/libérations)
   ├─ Graphiques par établissement/région
   └─ Export (CSV/Excel)

Ressources
├─ Bibliothèque (docs, templates, procédures)
├─ Liens utiles (portail RH État, etc)
└─ Support IT / Help desk (formulaire)

Paramètres & Sécurité
├─ Changer mot de passe
├─ MFA (2FA re-setup)
├─ Sessions actives (déconnexion à distance)
├─ Historique de connexion
└─ Export de données personnelles (RGPD)
```

**Données :**
- Données RH (agents, congés, affectations)
- Circulaires et notes de service (éditorialisées)
- Annuaire (lecture seule)
- Modules métier (selon permissions RBAC)

**Interactions API :**
```
GET    /api/v1/intranet/me/               (profil utilisateur)
GET    /api/v1/intranet/circulars/        (notes de service)
GET    /api/v1/intranet/directory/agents/ (annuaire)
GET    /api/v1/intranet/leave-balance/    (solde congés)
POST   /api/v1/intranet/leave-request/    (demande congés)
GET    /api/v1/intranet/statistics/       (tableaux BI)
GET    /api/v1/intranet/organization/     (organigramme)
```

**Sécurité :**
- Authentification JWT + MFA (TOTP ou U2F)
- VPN d'État (allow-list IP)
- RBAC stricte (agent ne voit que ses propres données + annuaire)
- Audit de tous les accès (journal append-only)
- Sessions courtes (30 min inactivité)
- Pas d'indexation Google (`X-Robots-Tag: noindex`)

**Déploiement :** SPA (React bundle)

---

### **App 4 : Backoffice / Admin** (`admin.administrationpenitentiaire.sn`)

**Rôle :** Plateforme d'administration et d'instruction (CMS, gestion démarches, stats)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://admin.administrationpenitentiaire.sn` |
| **Accès** | VPN + MFA + RBAC (rôles) |
| **Audience** | Gestionnaires (communication, visites, concours, direction) |
| **Technologie** | React + Vite + TypeScript (SPA) |
| **Performance** | Standard |

**Fonctionnalités :**

```
Gestion éditorialale (CMS) — M2
├─ Actualités
│  ├─ Liste (publiées, brouillons, programmées)
│  ├─ Éditeur WYSIWYG (Markdown ou simple)
│  ├─ Médias intégrés (galerie)
│  ├─ Catégories et tags
│  ├─ Programmation (publication différée)
│  └─ Révision (history)
├─ Pages statiques (À propos, mentions légales, etc)
│  ├─ Éditeur texte riche
│  ├─ SEO (meta title/description, slug)
│  └─ Publication
├─ FAQ
│  ├─ Gestion par catégorie
│  ├─ Ordre de priorité (drag-drop)
│  └─ Activation/désactivation
├─ Fichiers téléchargeables (documents, avis de concours)
│  ├─ Upload (PDF, DOC, etc)
│  ├─ Versioning
│  ├─ Permissions d'accès
│  └─ Tracking des téléchargements
└─ Campagnes (email/SMS aux demandeurs)
   ├─ Création de templates
   ├─ Segmentation (par état de demande)
   ├─ Programmation de l'envoi
   └─ Reporting (ouverture, clics)

Instruction des demandes — M3, M4
├─ Demandes de visite
│  ├─ Queue (à traiter)
│  │  ├─ Filtres (établissement, date, état)
│  │  └─ Tri (FIFO, urgence)
│  ├─ Détail de la demande
│  │  ├─ Infos demandeur + personne détenue
│  │  ├─ Pièces justificatives (prévisualisation)
│  │  ├─ Score de validation auto (ML optionnel)
│  │  └─ Commentaires internes
│  ├─ Actions
│  │  ├─ ✓ Valider (génère permis + QR Code signé JWS)
│  │  ├─ ✗ Rejeter (motif obligatoire, notif usager)
│  │  └─ ? Demander infos complémentaires
│  ├─ Génération du permis (PDF + QR Code + SMS/email au demandeur)
│  └─ Export (liste autorisations pour établissements)

├─ Concours
│  ├─ Gestion des campagnes
│  │  ├─ Créer concours (dates, avis, conditions)
│  │  ├─ Publier avis (portail + demarches)
│  │  ├─ Calendrier (dépôt, admissibilité, résultats)
│  │  └─ Clôturer
│  ├─ Queue de candidatures
│  │  ├─ Filtres (état, établissement, grade)
│  │  └─ Bulk actions (marquer admissible, rejeter, etc)
│  ├─ Validation des candidatures
│  │  ├─ Vérification des pièces
│  │  ├─ Contrôle des conditions (âge, diplômes)
│  │  ├─ Score (note orale + écrit si applicable)
│  │  └─ Résultat (admis, admissible, rejeté)
│  ├─ Génération des convocations (PDF + envoi mail/SMS)
│  ├─ Publication des résultats
│  ├─ Rapports (candidatures par concours, taux réussite)
│  └─ Gestion des paiements (logs, remboursements)

└─ Suivi global (Dashboard)
   ├─ Demandes en attente (par type, par établissement)
   ├─ SLA (délai moyen, % dans les délais)
   ├─ Performance (utilisateurs, charges)
   └─ Alertes (erreurs, quotas)

Gestion des établissements — M9
├─ Liste des établissements (13)
│  ├─ Infos : coordonnées, horaires, capacité
│  ├─ Photos
│  ├─ Contact responsable
│  ├─ Capacité (mise à jour)
│  ├─ Directeur affecté
│  └─ Règlement (affichage public)
├─ Création/modification
│  ├─ Form : nom, type, région, localisation (GPS)
│  ├─ Upload photos
│  └─ Publication (visible sur portail)
└─ Annuaire d'ateliers (réinsertion)
   ├─ Liste des ateliers par établissement
   ├─ Fiche atelier (nom, description, résultats)
   └─ Mise à jour saisonnière

Gestion des dossiers détenus (brouillon) — M10
├─ Index des détenus
│  ├─ Recherche (numéro écrou, nom)
│  ├─ Fiche détenu (données chiffrées)
│  ├─ Historique (entrée/sortie)
│  └─ Liens (visites autorisées, documents)
└─ (Module complet en Phase 5 — sensitive)

Statistiques & BI — M11
├─ Tableaux de bord
│  ├─ Population (totale, par établissement, par genre)
│  ├─ Flux (admissions/libérations/transferts par mois)
│  ├─ Démarches (demandes visites, concours)
│  └─ Performance (SLA, temps de traitement)
├─ Graphiques interactifs (Recharts)
│  ├─ Courbes, histogrammes, camemberts
│  ├─ Filtres (date, établissement, type)
│  └─ Export (PNG, SVG)
├─ Rapports (génération mensuelle/annuelle)
│  ├─ Rapport d'activité
│  ├─ Rapport RH (effectifs, congés)
│  └─ Rapport statistiques judiciaires
└─ Data export (CSV, Excel, à-plat pour BI externe)

Gestion des utilisateurs & permissions — M15
├─ Liste des utilisateurs (agents, gestionnaires)
├─ Création/modification compte
│  ├─ Email, nom, grade/fonction
│  ├─ Établissement affecté
│  ├─ Rôles (gestionnaire comms, instruction visites, instruction concours, direction, etc)
│  ├─ Périmètres (établissements/régions autorisées)
│  └─ Activation/désactivation
├─ Réinitialisation de mot de passe
├─ Audit (qui a modifié quoi, quand)
└─ Bulk import (CSV de comptes)

Paramètres système
├─ Configuration de l'application
│  ├─ Titre du site, logo
│  ├─ Délai de traitement (SLA cible)
│  ├─ Établissements ouverts aux demandes
│  └─ Actif/inactif des fonctionnalités
├─ Templates email/SMS
│  ├─ Confirmation de dépôt
│  ├─ Décision (validation/rejet)
│  ├─ Rappel (en attente)
│  └─ Convocation (concours)
├─ Intégrations externes
│  ├─ Paiement (configs)
│  ├─ SMS (configs)
│  ├─ Email (SMTP)
│  └─ Logs (Sentry, ELK)
└─ Sauvegardes & données
   ├─ Log audit (consultation)
   ├─ Export données (RGPD)
   └─ Import données (bulk)
```

**Données :**
- Contenu éditorial (actualités, pages, FAQ)
- Demandes (visites, concours) et états
- Autorisations de visite et permis générés
- Utilisateurs et rôles
- Statistiques et rapports
- Journaux d'audit

**Interactions API :**
```
POST   /api/v1/backoffice/news/                  (créer actualité)
GET    /api/v1/backoffice/visits/queue/          (queue de visites)
PUT    /api/v1/backoffice/visits/{id}/approve/   (valider visite)
PUT    /api/v1/backoffice/visits/{id}/reject/    (rejeter visite)
POST   /api/v1/backoffice/visits/{id}/permit-pdf/ (générer permis)

GET    /api/v1/backoffice/contests/              (lister concours)
POST   /api/v1/backoffice/contests/              (créer concours)
GET    /api/v1/backoffice/candidates/queue/      (queue candidatures)
PUT    /api/v1/backoffice/candidates/{id}/score/ (ajouter score)

GET    /api/v1/backoffice/statistics/            (tableaux BI)
GET    /api/v1/backoffice/users/                 (gestion utilisateurs)
GET    /api/v1/backoffice/audit/                 (logs audit)
```

**Sécurité :**
- VPN d'État + MFA
- RBAC granulaire (rôles : comm, instruction visites, concours, direction)
- Périmètres (gestionnaire n'accède que à ses établissements/régions)
- Audit complet (qui a validé/rejeté, quand, de quel IP)
- Pas d'indexation Google
- Chiffrement des données sensibles

**Déploiement :** SPA (React bundle)

---

## 🔌 Backend Django + DRF

```
┌─────────────────────────────────────────────────────────────────┐
│                  Backend Django + DRF (/api/v1)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 9 applications métier (apps) + 1 app core :                     │
│                                                                  │
│ ├─ core              — Models de base, audit, RBAC              │
│ ├─ public            — Contenu public (news, pages, FAQ)        │
│ ├─ establishments    — Annuaire établissements                  │
│ ├─ visits            — M3 : Demandes de visite + instruction    │
│ ├─ contests          — M4 : Concours + candidatures             │
│ ├─ mail              — M5 : Gestion courrier (GEC)              │
│ ├─ documents         — M6 : Gestion documentaire (GED + OCR)    │
│ ├─ staff             — M8 : Gestion RH agents                   │
│ ├─ detained          — M10 : Gestion détenus (SENSITIVE)        │
│ └─ statistics        — M11 : Tableaux BI                        │
│                                                                  │
│ Middleware & services transversaux :                            │
│ ├─ Authentication (JWT + MFA/TOTP)                              │
│ ├─ Authorization (RBAC + périmètres)                            │
│ ├─ Audit (journal append-only)                                  │
│ ├─ Encryption (AES-256-GCM pour champs sensibles)               │
│ ├─ Error handling (RFC 9457 Problem Details)                    │
│ ├─ API versioning (/api/v1/)                                    │
│ ├─ OpenAPI 3.1 (drf-spectacular)                                │
│ └─ Rate limiting                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Endpoints principaux

```
Public (sans auth) :
  GET  /api/v1/public/establishments/     — Annuaire établissements
  GET  /api/v1/public/establishments/{id}/ — Fiche établissement
  GET  /api/v1/public/news/               — Actualités
  GET  /api/v1/public/pages/{slug}/       — Pages statiques
  GET  /api/v1/public/faq/                — FAQ
  POST /api/v1/public/contact/            — Formulaire contact
  GET  /api/v1/health/                    — Health check

Authentification :
  POST /api/v1/auth/register/             — Créer compte (optionnel)
  POST /api/v1/auth/login/                — Connexion (email + password)
  POST /api/v1/auth/token/refresh/        — Rafraîchir JWT
  POST /api/v1/auth/mfa/setup/            — Configurer MFA
  POST /api/v1/auth/logout/               — Déconnexion

Démarches (demarches.…) :
  POST   /api/v1/demarches/visits/              — Soumettre demande visite
  GET    /api/v1/demarches/visits/{id}/         — Récupérer demande
  PUT    /api/v1/demarches/visits/{id}/         — Mettre à jour brouillon
  GET    /api/v1/demarches/tracking/{ref}/      — Suivi par n° suivi
  GET    /api/v1/demarches/visits/{id}/pdf/     — Télécharger permis (PDF + QR)
  
  POST   /api/v1/demarches/contests/open/       — Lister concours ouverts
  POST   /api/v1/demarches/candidates/          — Soumettre candidature
  GET    /api/v1/demarches/candidates/{id}/     — État candidature
  POST   /api/v1/demarches/payments/            — Initier paiement
  GET    /api/v1/demarches/payments/{id}/       — Vérifier paiement

Intranet (intranet.…) — Authentifié + VPN :
  GET  /api/v1/intranet/me/                     — Mon profil
  GET  /api/v1/intranet/directory/agents/       — Annuaire agents
  GET  /api/v1/intranet/leave-balance/          — Solde congés
  POST /api/v1/intranet/leave-request/          — Demander congé
  GET  /api/v1/intranet/circulars/              — Notes de service
  GET  /api/v1/intranet/statistics/             — Tableaux BI

Admin (admin.…) — Authentifié + VPN + RBAC :
  GET    /api/v1/backoffice/news/               — Lister actualités
  POST   /api/v1/backoffice/news/               — Créer actualité
  PUT    /api/v1/backoffice/news/{id}/          — Modifier actualité
  DELETE /api/v1/backoffice/news/{id}/          — Supprimer actualité
  
  GET    /api/v1/backoffice/visits/queue/       — Queue de visites
  GET    /api/v1/backoffice/visits/{id}/        — Détail visite
  PUT    /api/v1/backoffice/visits/{id}/approve/ — Valider visite
  PUT    /api/v1/backoffice/visits/{id}/reject/  — Rejeter visite
  POST   /api/v1/backoffice/visits/{id}/permit-pdf/ — Générer permis
  
  GET    /api/v1/backoffice/candidates/queue/   — Queue candidatures
  PUT    /api/v1/backoffice/candidates/{id}/score/ — Ajouter score
  
  GET    /api/v1/backoffice/statistics/         — Tableaux BI
  GET    /api/v1/backoffice/audit/              — Logs audit
  GET    /api/v1/backoffice/users/              — Gestion utilisateurs
```

---

## 🔄 Flux de communication (données)

### Flux 1 : Demande de visite (de bout en bout)

```
1. Citoyen sur demarches.…
   └─ Remplit formulaire de demande visite (5 étapes)
   └─ POST /api/v1/demarches/visits/ (+ fichiers upload)
      └─ Backend : valide, crée objet Visit, affecte n° DGAP-VIS-AAAA-XXXXXX
      └─ Envoie SMS/email de confirmation (via Celery)
      └─ Retourne n° suivi + code vérification

2. Citoyen recoit confirmation
   └─ Email : "Votre demande a été enregistrée. N° suivi : DGAP-VIS-AAAA-XXXXXX"
   └─ SMS : Lien vers suivi + n° suivi

3. Gestionnaire visites sur admin.…
   └─ GET /api/v1/backoffice/visits/queue/ (filtre par établissement)
   └─ Voit la demande en attente
   └─ Clique pour ouvrir détail
   └─ Vérifie pièces justificatives + données
   └─ Valide ou rejette
      ├─ Si validation :
      │  └─ PUT /api/v1/backoffice/visits/{id}/approve/
      │  └─ Backend : change état → "approved", génère permis (PDF + QR Code)
      │  └─ Envoie SMS/email au citoyen : "Permis approuvé"
      │
      └─ Si rejet :
         └─ PUT /api/v1/backoffice/visits/{id}/reject/ + motif
         └─ Backend : change état → "rejected"
         └─ Envoie SMS/email au citoyen : "Demande rejetée : [motif]"

4. Citoyen suit sa demande
   └─ Retour sur demarches.… "Suivi"
   └─ Rentre n° suivi + code vérification
   └─ GET /api/v1/demarches/tracking/{ref}/ (vérifie droits)
   └─ Voit l'état : "Validée" + timeline + permis (PDF avec QR)
   └─ Télécharge permis
      └─ GET /api/v1/demarches/visits/{id}/pdf/
      └─ Backend génère PDF (WeasyPrint) + QR Code signé (JWS)

5. Agent à l'établissement
   └─ Scanne QR Code du citoyen
   └─ Valide signature JWS (vérification intégrité + date validité)
   └─ Autorisation accordée
```

### Flux 2 : Inscription à un concours

```
1. Candidat sur demarches.…
   └─ Consulte avis des concours ouverts
   └─ S'inscrit (formulaire multi-étapes)
   └─ Upload CV + diplômes + attestations
   └─ Paie frais (Orange Money / Wave / mock)
      └─ POST /api/v1/demarches/payments/
      └─ Backend : crée transaction, attend confirmation de l'agrégateur
   └─ POST /api/v1/demarches/candidates/ (après paiement validé)
      └─ Backend : crée candidature, affecte n° CONC-AAAA-CC-XXXXXX
      └─ Email de confirmation + reçu de paiement

2. Service concours sur admin.…
   └─ GET /api/v1/backoffice/candidates/queue/ (filtre par concours)
   └─ Gère le dossier (vérification documents)
   └─ Ajoute score
      └─ PUT /api/v1/backoffice/candidates/{id}/score/
   └─ Marque comme "admissible" ou "rejeté"
   └─ Backend : notifie candidat (email)

3. Publication des résultats
   └─ Admin publie résultats (date officialisée)
   └─ Candidats reçoivent notification
   └─ Admissibles téléchargent convocation

4. Candidat reçoit convocation
   └─ Notification par SMS/email
   └─ Lien vers espace candidat
   └─ Télécharge convocation (PDF + heure/lieu concours)
```

### Flux 3 : Édition du portail (CMS)

```
1. Agent communication sur admin.…
   └─ POST /api/v1/backoffice/news/ (créer article)
   └─ Remplit : titre, description, contenu, images
   └─ Choisit état : brouillon / programmé / publié
   └─ Si programmé : choisit date/heure de publication
   └─ Backend : crée News, stocke images sur MinIO/S3

2. Article apparaît sur portail.…
   └─ GET /api/v1/public/news/ (app Portail récupère en SSG/build-time)
   └─ Article visible dans "Actualités récentes"
   └─ Citoyens peuvent lire + partager

3. Modification
   └─ Admin modifie article
   └─ PUT /api/v1/backoffice/news/{id}/
   └─ Backend : met à jour, invalide cache
   └─ Portail se rebuild (ou fetch en live si SSG + ISR)
```

---

## 🗄️ Couche données

```
┌──────────────────────────────────────┐
│       PostgreSQL 16 (production)     │
├──────────────────────────────────────┤
│                                      │
│ Schémas cloisonnés (par domaine) :  │
│                                      │
│ ├─ public_schema                     │
│ │  ├─ users (agents, gestionnaires)  │
│ │  ├─ news, pages, faq (contenu)     │
│ │  ├─ establishments (annuaire)      │
│ │  └─ settings (config app)          │
│ │                                    │
│ ├─ visits_schema                     │
│ │  ├─ visits (demandes visites)      │
│ │  ├─ visit_permits (permis générés) │
│ │  └─ visit_history (timeline)       │
│ │                                    │
│ ├─ contests_schema                   │
│ │  ├─ contests (concours)            │
│ │  ├─ candidates (candidatures)      │
│ │  ├─ contest_results (résultats)    │
│ │  └─ payments (transactions)        │
│ │                                    │
│ ├─ detention_schema (CHIFFRÉ)         │
│ │  ├─ detainees (détenus)            │
│ │  └─ detention_history              │
│ │                                    │
│ ├─ staff_schema                      │
│ │  ├─ agents (agents pénitentiaires) │
│ │  ├─ leave_requests (congés)        │
│ │  └─ assignments (affectations)     │
│ │                                    │
│ ├─ audit_schema (APPEND-ONLY)        │
│ │  └─ audit_log (journal inaltérable)│
│ │                                    │
│ └─ documents_schema                  │
│    ├─ documents (fichiers uploadés)  │
│    └─ ocr_results (résultats OCR)    │
│                                      │
│ Tous les champs sensibles sont       │
│ chiffrés (AES-256-GCM) au niveau app │
│                                      │
└──────────────────────────────────────┘

Cache & Sessions (Redis) :
  ├─ Listings en cache (news, établissements)
  ├─ Sessions utilisateur (JWT stored in Redis for revocation)
  ├─ File d'attente Celery (tasks async)
  └─ Rate limiting (tokens)

Stockage objet (MinIO / AWS S3) :
  ├─ Médias (images articles, photos établissements)
  ├─ Pièces justificatives (PDF/JPG uploadées par usagers)
  ├─ Permis générés (PDF + QR Code)
  ├─ Exports (CSV/Excel)
  └─ Backups (sauvegardes incrémentielles)
```

---

## 🔐 Sécurité par zone

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZONES DE SÉCURITÉ                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ZONE 1 : PUBLIC (www.…, demarches.…)                            │
│ ├─ Accès : Internet (pas d'authentification pour lecture)       │
│ ├─ Données : Contenu public uniquement                          │
│ ├─ Protection :                                                 │
│ │  ├─ TLS 1.3 (chiffrement en transit)                          │
│ │  ├─ HSTS + CSP stricte                                        │
│ │  ├─ Rate limiting (per IP, per endpoint)                      │
│ │  ├─ Captcha sur formulaires (reCAPTCHA v3)                   │
│ │  ├─ Validation entrées (XSS protection)                       │
│ │  └─ Logging public (audit)                                    │
│ │                                                                │
│ │ Dépôt de demandes (semi-public) :                             │
│ │  ├─ TLS, CSRF token                                           │
│ │  ├─ Validation fichiers (MIME, taille max 10Mo)              │
│ │  ├─ Chiffrement données sensibles (email, tel, ID)           │
│ │  ├─ Stockage sur S3 (pas disque)                             │
│ │  └─ Rate limit : 5 dépôts/jour/IP                            │
│                                                                  │
│ ZONE 2 : INTRANET (intranet.…)                                 │
│ ├─ Accès : VPN d'État uniquement                                │
│ ├─ Authentification : Email + MFA (TOTP/U2F)                   │
│ ├─ Données : RH, circulaires, annuaire, stats métier           │
│ ├─ Protection :                                                 │
│ │  ├─ TLS 1.3                                                   │
│ │  ├─ JWT (courte durée : 15 min)                              │
│ │  ├─ MFA obligatoire (pas de fallback)                        │
│ │  ├─ Audit complet (qui ? quand ? d'où ?)                     │
│ │  ├─ Sessions courtes (timeout 30 min inactivité)             │
│ │  ├─ Déconnexion à distance possible                          │
│ │  ├─ RBAC (agent ne voit que ses infos)                       │
│ │  ├─ IP allow-list (VPN)                                      │
│ │  └─ Pas d'indexation Google (noindex)                        │
│                                                                  │
│ ZONE 3 : BACKOFFICE (admin.…)                                  │
│ ├─ Accès : VPN + Authentification + RBAC                       │
│ ├─ Authentification : Email + MFA (obligatoire)                │
│ ├─ Données : Contenu éditorial, instruction demandes, RH       │
│ ├─ Protection (stricte) :                                       │
│ │  ├─ TLS 1.3                                                   │
│ │  ├─ JWT + MFA                                                │
│ │  ├─ RBAC granulaire (rôles + périmètres)                     │
│ │  ├─ Audit complet (trail immuable)                           │
│ │  ├─ Sessions très courtes (10–15 min)                        │
│ │  ├─ IP allow-list (VPN)                                      │
│ │  ├─ Chiffrement PII (email, téléphone agents)                │
│ │  ├─ Logs centralisés (Sentry/ELK)                            │
│ │  ├─ Signaturage des documents (permis, convocations)         │
│ │  └─ Pas d'indexation Google (noindex)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Services asynchrones (Celery)

```
┌─────────────────────────────────────────┐
│         Celery + Redis (async jobs)     │
├─────────────────────────────────────────┤
│                                          │
│ Workers :                                │
│ ├─ notifications                         │
│ │  ├─ send_email (SMTP)                 │
│ │  ├─ send_sms (Twilio ou local)        │
│ │  └─ send_push (optionnel, mobile)     │
│ │                                        │
│ ├─ documents                             │
│ │  ├─ generate_permit_pdf (WeasyPrint)  │
│ │  ├─ generate_convocation_pdf          │
│ │  ├─ ocr_document (Tesseract + ML)     │
│ │  └─ extract_text_from_pdf             │
│ │                                        │
│ ├─ reporting                             │
│ │  ├─ generate_monthly_report           │
│ │  ├─ generate_export_csv               │
│ │  └─ compute_statistics                │
│ │                                        │
│ ├─ maintenance                           │
│ │  ├─ cleanup_temp_files                │
│ │  ├─ archive_old_data                  │
│ │  └─ optimize_db_indexes               │
│ │                                        │
│ └─ integrations                          │
│    ├─ sync_payment_status (payment API) │
│    ├─ sync_sms_delivery_status          │
│    └─ pull_oidc_user (Keycloak, si SSO)│
│                                          │
│ Beat (scheduler) :                       │
│ ├─ Toutes les 5 min : purger sessions   │
│ ├─ Tous les jours 23h : backup DB       │
│ ├─ 1er du mois : rapport statistiques   │
│ └─ Toutes les 6h : cleanup cache        │
│                                          │
│ Monitoring :                             │
│ ├─ Flower (dashboard Celery)            │
│ ├─ Logs structurés (JSON)               │
│ └─ Alertes (queues backlog, workers ⬇️) │
│                                          │
└─────────────────────────────────────────┘
```

---

## 📈 Flux de scalabilité (roadmap)

```
Aujourd'hui (Phase 0–3, Q1–Q2 2025) :
  ├─ Monolithe modulaire (Django)
  ├─ 4 SPAs React (frontends)
  ├─ PostgreSQL (une DB)
  ├─ Redis (sessions + cache)
  └─ Celery (workers simples)
  
  Capacité : ~5 000 demandes/jour, ~1 000 utilisateurs simultanés

Phase 4 (Q3–Q4 2025) — Microservices (optionnel) :
  ├─ Extraire services critiques :
  │  ├─ micro-visits (M3 isolé)
  │  ├─ micro-contests (M4 isolé)
  │  ├─ micro-documents (GED isolée)
  │  └─ micro-auth (AuthN/AuthZ centralisé)
  │
  ├─ API Gateway (Kong, Traefik)
  ├─ Message queue (RabbitMQ en plus de Redis)
  ├─ Service mesh (optionnel : Istio)
  └─ DB par service (CQRS, Event Sourcing)
  
  Capacité : ~50 000 demandes/jour, ~10 000 utilisateurs simultanés

Phase 5+ (2026+) — Cloud native :
  ├─ Kubernetes (EKS, GKE, OpenShift)
  ├─ Auto-scaling horizontal
  ├─ Multi-région (DR, latency)
  ├─ Serverless (Lambda, Cloud Functions)
  └─ DataWarehousing (BigQuery, Redshift)
  
  Capacité : illimitée (multi-région)
```

---

## 📋 Résumé des rôles par application

| Application | URL | Publique ? | Auth ? | MFA ? | VPN ? | Utilisateurs |
|---|---|---|---|---|---|---|
| **Portail** | www.… | ✅ Oui | ❌ Non | — | ❌ Non | Grand public |
| **Démarches** | demarches.… | ✅ Oui (semi) | ✅ Oui (suivi) | ❌ Non | ❌ Non | Demandeurs + candidats |
| **Intranet** | intranet.… | ❌ Non | ✅ Oui | ✅ Oui | ✅ Oui | Agents (~2 400) |
| **Backoffice** | admin.… | ❌ Non | ✅ Oui | ✅ Oui | ✅ Oui | Gestionnaires (~50–100) |

---

## 🔗 Intégrations externes

```
Paiement
├─ Orange Money (API Senegal)
├─ Wave (API)
└─ Mock (développement)

SMS
├─ Twilio (si budget)
├─ Orange SMS (carrier sénégalais)
└─ Mock (console logs en dev)

Email
├─ SMTP custom (ex. Mailgun, SendGrid)
└─ Mailhog (développement)

SSO (optionnel)
├─ Keycloak (OIDC)
├─ Active Directory (entreprise)
└─ Agence de l'État Sénégalaise (si dispo)

Monitoring
├─ Sentry (error tracking)
├─ Datadog / New Relic (APM, optionnel)
└─ ELK / OpenSearch (logs)

Stockage
├─ AWS S3 (production)
├─ MinIO (self-hosted)
└─ OVHCloud Object Storage (souveraineté)

Souveraineté
├─ Hébergement : France (Scality, OVH) ou Sénégal (TBD)
├─ Données : jamais aux USA
├─ Infrast. : CDN souverain (Cloudflare FR, Akamai FR)
└─ Chiffrement : clés gérées localement
```

---

## 📚 Pour aller plus loin

1. **PROMPT_CLAUDE_CODE_DGAP.md** — Tout le code à générer (18 sections)
2. **DESIGN_SYSTEM.md** — Palettes, composants, animations
3. **DEPLOYMENT_RENDER.md** — Déploiement sur Render ou autre PaaS
4. **Diagrammes détaillés** : voir fichiers `.mermaid` (si créés) pour ERD, C4, sequence diagrams

---

**Architecture v1.0 — DGAP Sénégal**
*Projet complet : backend + 4 frontends + services + données*
*Mis à jour : décembre 2024*