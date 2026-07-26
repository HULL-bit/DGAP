export type StatutContenu = 'BROUILLON' | 'RELECTURE' | 'VALIDE' | 'PUBLIE' | 'ARCHIVE'

export interface ArticleBackoffice {
  id: string
  titre: string
  slug: string
  chapo: string
  contenu: string
  statut: StatutContenu
  rubrique: { id: string; code: string; titre: string } | null
  date_publication: string | null
  image_url: string
  meta_titre: string
  meta_description: string
  cree_le: string
  modifie_le: string
}

export interface VersionContenu {
  id: string
  numero: number
  instantane: Record<string, unknown>
  auteur_nom: string | null
  commentaire: string
  cree_le: string
}

export interface Pagination<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export const LIBELLES_STATUT: Record<StatutContenu, string> = {
  BROUILLON: 'Brouillon',
  RELECTURE: 'En relecture',
  VALIDE: 'Validé',
  PUBLIE: 'Publié',
  ARCHIVE: 'Archivé',
}

/** Actions de transition possibles depuis chaque statut (miroir de TRANSITIONS_AUTORISEES côté API). */
export const ACTIONS_PAR_STATUT: Record<StatutContenu, { action: string; libelle: string }[]> = {
  BROUILLON: [{ action: 'soumettre', libelle: 'Soumettre à la relecture' }],
  RELECTURE: [
    { action: 'valider', libelle: 'Valider' },
    { action: 'rejeter', libelle: 'Renvoyer en brouillon' },
  ],
  VALIDE: [
    { action: 'publier', libelle: 'Publier' },
    { action: 'rejeter', libelle: 'Renvoyer en brouillon' },
  ],
  PUBLIE: [{ action: 'archiver', libelle: 'Archiver' }],
  ARCHIVE: [{ action: 'reactiver', libelle: 'Réactiver (brouillon)' }],
}
