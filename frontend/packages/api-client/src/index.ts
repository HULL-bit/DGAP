export { requeteApi, ApiError } from './client'
export type { ErreurApi } from './client'

export {
  definirJetons,
  effacerJetons,
  obtenirJetonAcces,
  obtenirJetonRafraichissement,
  estConnecte,
} from './session'

// Le client généré (src/genere/) apparaît après `pnpm generate`, une fois le
// schéma docs/api/openapi.yaml produit par le backend (drf-spectacular).
// Non versionné tel quel : régénéré en CI à chaque évolution de l'API.
