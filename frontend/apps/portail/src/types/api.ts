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

export interface Rubrique {
  id: string
  code: string
  titre: string
  parent: string | null
  ordre: number
}

export interface ArticleListe {
  id: string
  titre: string
  slug: string
  chapo: string
  rubrique: Rubrique | null
  date_publication: string | null
  image_url: string
}

export interface ArticleDetail extends ArticleListe {
  contenu: string
  galerie_code: string | null
  meta_titre: string
  meta_description: string
}

export interface FAQ {
  id: string
  question: string
  reponse: string
  categorie: string
  ordre: number
}

export interface ContactAccuse {
  numero_ticket: string
  sujet: string
  cree_le: string
}

export interface Pagination<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export type TypeMedia = 'IMAGE' | 'VIDEO'

export interface MediaGalerie {
  id: string
  type: TypeMedia
  image: string | null
  video_url: string
  legende: string
  ordre: number
}

export interface Galerie {
  id: string
  code: string
  titre: string
  description: string
  medias: MediaGalerie[]
}

export interface GalerieResume {
  id: string
  code: string
  titre: string
  description: string
  couverture: string
  nombre_medias: number
}

export type NatureDocument = 'LOI' | 'DECRET' | 'ARRETE' | 'AVIS_CONCOURS' | 'COMMUNIQUE' | 'RAPPORT'

export const LIBELLES_NATURE_DOCUMENT: Record<NatureDocument, string> = {
  LOI: 'Loi',
  DECRET: 'Décret',
  ARRETE: 'Arrêté',
  AVIS_CONCOURS: 'Avis de concours',
  COMMUNIQUE: 'Communiqué',
  RAPPORT: 'Rapport',
}

export interface DocumentOfficiel {
  id: string
  titre: string
  nature: NatureDocument
  numero: string
  date_texte: string | null
  statut: 'EN_VIGUEUR' | 'ABROGE'
  categorie: string
  fichier_url: string
}

export interface ProduitBoutique {
  id: string
  nom: string
  slug: string
  categorie: string
  description: string
  prix: string
  prix_promotionnel: string | null
  image_url: string
}
