/**
 * Mutator fetch de base consommé par le client généré (orval). Ajoute la corrélation
 * de requêtes (correlation_id, cf. journalisation structurée backend), l'en-tête
 * `Authorization` (comptes internes) avec rafraîchissement automatique sur 401, et
 * gère les erreurs au format RFC 9457 (§6.1) de façon uniforme pour les 4 applications.
 */

import { definirJetons, effacerJetons, obtenirJetonAcces, obtenirJetonRafraichissement } from './session'

export interface ErreurApi {
  type: string
  title: string
  status: number
  detail?: string
  correlation_id?: string
  /** Présent sur les erreurs de validation (400) — un message par champ en défaut. */
  erreurs_champs?: Record<string, string[]>
}

export class ApiError extends Error {
  constructor(public readonly probleme: ErreurApi) {
    super(probleme.detail ?? probleme.title)
  }
}

function genererIdCorrelation(): string {
  return crypto.randomUUID()
}

function baseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
}

let rafraichissementEnCours: Promise<boolean> | null = null

async function tenterRafraichissement(refresh: string): Promise<'ok' | 'jeton-perime' | 'echec'> {
  try {
    const reponse = await fetch(`${baseUrl()}/auth/rafraichissement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!reponse.ok) return 'jeton-perime'
    // `ROTATE_REFRESH_TOKENS=True` côté backend (SIMPLE_JWT) : chaque
    // rafraîchissement invalide l'ancien refresh token et en émet un nouveau.
    // Ne pas le persister ici ferait échouer le rafraîchissement suivant (token
    // devenu invalide) et déconnecterait l'agent bien avant les 24h prévues.
    const donnees = (await reponse.json()) as { access: string; refresh?: string }
    definirJetons({ access: donnees.access, refresh: donnees.refresh })
    return 'ok'
  } catch {
    return 'echec'
  }
}

/**
 * Échange le refresh token contre un nouvel access token. Un seul appel concurrent
 * à la fois par onglet (`rafraichissementEnCours`) — mais le refresh token vit dans
 * `localStorage`, partagé entre tous les onglets d'un même agent. Si un AUTRE onglet
 * a rafraîchi entre-temps, celui-ci invalide l'ancien jeton (rotation ci-dessus) :
 * sans la revérification ci-dessous, ce second onglet prendrait ce rejet pour une
 * session morte et redemanderait mot de passe + code TOTP alors que la session est
 * toujours valide ailleurs — on retente donc une fois avec le jeton réellement en
 * stockage avant d'abandonner.
 */
async function rafraichirSession(): Promise<boolean> {
  const refresh = obtenirJetonRafraichissement()
  if (!refresh) return false

  if (!rafraichissementEnCours) {
    rafraichissementEnCours = (async () => {
      try {
        let resultat = await tenterRafraichissement(refresh)
        if (resultat === 'jeton-perime') {
          const refreshActuel = obtenirJetonRafraichissement()
          if (refreshActuel && refreshActuel !== refresh) {
            resultat = await tenterRafraichissement(refreshActuel)
          }
        }
        if (resultat !== 'ok') {
          effacerJetons()
        }
        return resultat === 'ok'
      } finally {
        rafraichissementEnCours = null
      }
    })()
  }
  return rafraichissementEnCours
}

async function traiterReponse<T>(reponse: Response): Promise<T> {
  if (!reponse.ok) {
    const probleme = (await reponse.json().catch(() => null)) as ErreurApi | null
    throw new ApiError(
      probleme ?? {
        type: 'about:blank',
        title: reponse.statusText,
        status: reponse.status,
      },
    )
  }

  if (reponse.status === 204) return undefined as T
  return (await reponse.json()) as T
}

export async function requeteApi<T>(url: string, options: RequestInit = {}, _tentative = 0): Promise<T> {
  const jeton = obtenirJetonAcces()
  const reponse = await fetch(`${baseUrl()}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': genererIdCorrelation(),
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...options.headers,
    },
  })

  if (reponse.status === 401 && _tentative === 0 && (await rafraichirSession())) {
    return requeteApi<T>(url, options, 1)
  }

  return traiterReponse<T>(reponse)
}

/**
 * Variante multipart (téléversement de fichiers) — n'impose pas `Content-Type` afin
 * que le navigateur pose lui-même la frontière `multipart/form-data`, sinon le
 * transfert du fichier échoue silencieusement côté serveur.
 */
export async function requeteApiFichier<T>(
  url: string,
  donnees: FormData,
  options: RequestInit = {},
  _tentative = 0,
): Promise<T> {
  const jeton = obtenirJetonAcces()
  const reponse = await fetch(`${baseUrl()}${url}`, {
    ...options,
    method: options.method ?? 'POST',
    credentials: 'include',
    body: donnees,
    headers: {
      'X-Correlation-Id': genererIdCorrelation(),
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...options.headers,
    },
  })

  if (reponse.status === 401 && _tentative === 0 && (await rafraichirSession())) {
    return requeteApiFichier<T>(url, donnees, options, 1)
  }

  return traiterReponse<T>(reponse)
}
