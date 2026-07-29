# Modèle de données — état Phase 0

Ce diagramme reflète **ce qui existe réellement** dans les migrations à ce stade
(`apps.comptes`, `apps.audit`). Le modèle cible complet (§5 du cahier des charges —
`demandes_visite`, `candidatures`, `courriers`, `documents`, `detenus`, etc.) sera
documenté ici au fur et à mesure que chaque bloc livre ses migrations réelles ; le
reproduire par anticipation sur des tables qui n'existent pas encore induirait en
erreur quiconque lit ce document pour comprendre l'état du dépôt.

```mermaid
erDiagram
    UTILISATEUR ||--o{ AFFECTATION_ROLE : "obtient des droits via"
    ROLE ||--o{ AFFECTATION_ROLE : "accordé par"
    PERIMETRE ||--o{ AFFECTATION_ROLE : "borne à"
    ROLE }o--o{ PERMISSION : porte

    UTILISATEUR ||--o{ ATTRIBUTION_PERMISSION : "exception directe"
    PERMISSION ||--o{ ATTRIBUTION_PERMISSION : "accordée par"
    PERIMETRE ||--o{ ATTRIBUTION_PERMISSION : "borne à"

    UTILISATEUR ||--o{ JOURNAL_ACTION : "trace les actions de"

    UTILISATEUR {
        uuid id PK
        string email UK
        string nom
        string prenom
        string matricule UK
        bool est_agent_interne
        bool mfa_active
    }
    PERMISSION {
        uuid id PK
        string code UK
        string categorie
    }
    ROLE {
        uuid id PK
        string code UK
        string libelle
    }
    PERIMETRE {
        uuid id PK
        string type
        string code UK
    }
    AFFECTATION_ROLE {
        uuid id PK
        bool actif
        date date_debut
        date date_fin
    }
    ATTRIBUTION_PERMISSION {
        uuid id PK
        string motif
        bool actif
    }
    JOURNAL_ACTION {
        uuid id PK
        string action
        string ressource_type
        string ressource_id
        datetime horodatage
    }
```

## Dictionnaire de données (Phase 0)

| Table | Rôle | Contrainte notable |
|---|---|---|
| `utilisateurs` | Compte nominatif | `email` unique, PK UUID v7 |
| `permissions` | Droit élémentaire | `code` unique (format `module:action`) |
| `roles` | Profil métier (paquet de permissions) | `code` unique |
| `perimetres` | Portée organisationnelle (national/direction/établissement) | `code` unique |
| `affectations_role` | Rôle accordé à un utilisateur sur un périmètre | unique (utilisateur, rôle, périmètre) |
| `attributions_permission` | Permission accordée directement, hors rôle | unique (utilisateur, permission, périmètre) |
| `journal_actions` | Audit append-only | aucune contrainte de mise à jour (voir `apps.audit`) |

## Bloc D — Téléservice Visites (`apps.visites`)

```mermaid
erDiagram
    ETABLISSEMENT ||--o{ CRENEAU_VISITE : propose
    ETABLISSEMENT ||--o{ DEMANDE_VISITE : concerne
    CRENEAU_VISITE ||--o{ DEMANDE_VISITE : reserve
    DEMANDE_VISITE ||--o{ PIECE_JOINTE_VISITE : "documente"
    DEMANDE_VISITE ||--o| PERMIS_VISITE : "délivre"

    DEMANDE_VISITE {
        uuid id PK
        string numero_suivi UK
        string code_suivi
        string statut
        string visiteur_nom
        string visiteur_email
        string detenu_nom_declare
        date date_souhaitee
        string cle_idempotence UK
    }
    CRENEAU_VISITE {
        uuid id PK
        date jour
        time heure_debut
        time heure_fin
        int capacite
    }
    PIECE_JOINTE_VISITE {
        uuid id PK
        string type_piece
        string empreinte_sha256
        string statut_controle
    }
    PERMIS_VISITE {
        uuid id PK
        string numero_permis UK
        text charge_qr_jws
        date valide_jusqu_au
        bool revoque
    }
```

| Table | Rôle | Contrainte notable |
|---|---|---|
| `demandes_visite` | Dépôt en ligne, machine à états | `numero_suivi`/`cle_idempotence` uniques |
| `creneaux_visite` | Plages horaires par établissement | capacité bornée |
| `pieces_jointes_visite` | Justificatifs téléversés | SHA-256 calculé à l'enregistrement |
| `permis_visite` | Permis signé (JWS), 1↔1 avec la demande | `numero_permis` unique |

## Extension Bloc B — Galeries (`apps.mediatheque`)

```mermaid
erDiagram
    GALERIE ||--o{ MEDIA_GALERIE : contient
    ARTICLE }o--o| GALERIE : illustre

    GALERIE {
        uuid id PK
        string code UK
        string titre
    }
    MEDIA_GALERIE {
        uuid id PK
        string type
        string image
        string video_url
        int ordre
        bool publie
    }
```

| Table | Rôle | Contrainte notable |
|---|---|---|
| `galeries` | Collection de médias, référencée par `code` | `code` unique |
| `medias_galerie` | Image (MinIO) ou vidéo (lien incorporé) | exactement un des deux selon `type` |

## Boutique (`apps.boutique`)

Vitrine des produits fabriqués par les personnes détenues — catalogue de
présentation uniquement, aucune entité panier/commande/paiement (décision produit).

```mermaid
erDiagram
    PRODUIT_BOUTIQUE {
        uuid id PK
        string nom
        string slug UK
        string categorie
        decimal prix
        decimal prix_promotionnel
        string image
        bool disponible
        int ordre
    }
```

| Table | Rôle | Contrainte notable |
|---|---|---|
| `produits_boutique` | Fiche produit, vitrine publique filtrable par `categorie` | `slug` unique ; ni panier ni paiement |

## À venir

Le bloc E (`apps.concours`, `apps.paiements` — voir `docs/architecture.md`) est
livré et fonctionnel mais son MCD reste à documenter ici. Les blocs F et G
restants ajouteront leurs entités réelles à ce document au moment de leur
livraison, pas avant.
