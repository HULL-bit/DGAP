export interface Pagination<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export interface NoteDeService {
  id: string
  titre: string
  contenu: string
  perimetre_cible: string
  perimetre_cible_libelle: string
  accuse_lecture_requis: boolean
  cree_le: string
  lu: boolean
}

export interface ArticleListe {
  id: string
  titre: string
  slug: string
  chapo: string
  date_publication: string | null
  image_url: string
}

// --- RH (M8 + reste M7, jamais exposé côté public) ------------------------------

export type TypeDemandeRH = 'CONGE' | 'PERMISSION_ABSENCE' | 'ATTESTATION_TRAVAIL' | 'AUTRE'
export type StatutDemandeRH = 'SOUMISE' | 'VALIDEE' | 'REJETEE' | 'ANNULEE'

export const LIBELLES_TYPE_DEMANDE_RH: Record<TypeDemandeRH, string> = {
  CONGE: 'Congé',
  PERMISSION_ABSENCE: "Permission d'absence",
  ATTESTATION_TRAVAIL: 'Attestation de travail',
  AUTRE: 'Autre demande',
}

export const LIBELLES_STATUT_DEMANDE_RH: Record<StatutDemandeRH, string> = {
  SOUMISE: 'Soumise',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  ANNULEE: 'Annulée',
}

export interface AffectationAgentRH {
  id: string
  perimetre: string
  perimetre_libelle: string
  fonction: string
  date_debut: string
  date_fin: string | null
  est_active: boolean
}

export interface SoldeCongeRH {
  annee: number
  jours_acquis: string
  jours_pris: string
  jours_restants: string
}

export interface DossierAgentRH {
  id: string
  utilisateur_nom: string
  utilisateur_email: string
  matricule: string | null
  corps: string
  grade: string
  position_administrative: string
  situation_familiale: string
  date_entree_service: string | null
  diplomes: string
  affectations: AffectationAgentRH[]
  soldes_conge: SoldeCongeRH[]
  cree_le: string
}

export interface DemandeRH {
  id: string
  numero: string
  dossier: string
  dossier_nom: string
  type_demande: TypeDemandeRH
  statut: StatutDemandeRH
  date_debut: string | null
  date_fin: string | null
  nombre_jours: number | null
  motif: string
  valide_par_nom: string
  date_validation: string | null
  motif_rejet: string
  cree_le: string
}

export interface AgentAnnuaire {
  id: string
  nom: string
  email: string
  telephone: string
  corps: string
  grade: string
  fonction_actuelle: string
  perimetre_actuel_libelle: string
}
