/** Types miroir des sérialiseurs DRF (§6.1) — à remplacer par le client orval généré
 * une fois `pnpm --filter @dgap/api-client generate` outillé en CI (docs/api/openapi.yaml).
 */

export interface Region {
  id: string
  code: string
  nom: string
}

export interface TypeEtablissement {
  id: string
  code: string
  libelle: string
}

export interface DirectionRegionale {
  id: string
  code: string
  nom: string
  regions: Region[]
  directeur_nom: string
  directeur_email: string
  directeur_telephone: string
}

export interface Etablissement {
  id: string
  nom: string
  code: string
  type: TypeEtablissement
  direction_regionale: DirectionRegionale
  region: Region | null
  capacite: number | null
  adresse: string
  latitude: string | null
  longitude: string | null
  telephone: string
  email: string
  horaires_visite: string
  conditions_visite: string
}

export interface Pagination<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export type StatutDemandeVisite =
  | 'SOUMISE'
  | 'EN_INSTRUCTION'
  | 'PIECES_MANQUANTES'
  | 'VALIDEE'
  | 'REJETEE'
  | 'PERMIS_DELIVRE'

export interface DemandeVisiteCreation {
  visiteur_nom: string
  visiteur_prenom: string
  visiteur_email: string
  visiteur_telephone: string
  lien_parente: string
  detenu_nom_declare: string
  detenu_prenom_declare: string
  etablissement: string
  date_souhaitee: string
}

export interface DemandeVisiteAccuse {
  id: string
  numero_suivi: string
  code_suivi: string
  statut: StatutDemandeVisite
  cree_le: string
}

export interface DemandeVisiteStatutPublique {
  numero_suivi: string
  statut: StatutDemandeVisite
  etablissement: Etablissement
  date_souhaitee: string
  motif_rejet: string
  cree_le: string
}

// --- Téléservice Concours -----------------------------------------------------

export type StatutConcours = 'BROUILLON' | 'OUVERT' | 'CLOTURE' | 'RESULTATS_PUBLIES'

export interface Concours {
  id: string
  titre: string
  code: string
  description: string
  conditions: string
  frais_inscription: string
  date_ouverture: string
  date_cloture: string
  date_concours: string | null
  places_disponibles: number | null
  statut: StatutConcours
}

export type StatutCandidature =
  | 'SOUMISE'
  | 'EN_INSTRUCTION'
  | 'PIECES_MANQUANTES'
  | 'ADMISSIBLE'
  | 'CONVOQUE'
  | 'ADMIS'
  | 'REJETE'

export type StatutPaiement = 'EN_ATTENTE' | 'PAYE' | 'ECHEC'

export interface Paiement {
  id: string
  reference: string
  montant: string
  moyen: string
  statut: StatutPaiement
  paye_le: string | null
  cree_le: string
}

export interface CandidatureCreation {
  concours: string
  candidat_nom: string
  candidat_prenom: string
  candidat_email: string
  candidat_telephone: string
  niveau_etude: string
  experience: string
}

export interface CandidatureAccuse {
  id: string
  numero_suivi: string
  code_suivi: string
  statut: StatutCandidature
  paiement: Paiement | null
  cree_le: string
}

export interface CandidatureStatutPublique {
  numero_suivi: string
  statut: StatutCandidature
  concours: Concours
  motif_rejet: string
  paiement: Paiement | null
  cree_le: string
}
