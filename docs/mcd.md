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

## À venir

Chaque bloc (B à G, voir `docs/architecture.md`) ajoutera ses entités réelles à ce
document au moment de sa livraison, pas avant.
