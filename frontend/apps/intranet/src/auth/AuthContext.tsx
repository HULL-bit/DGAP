import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { requeteApi, ApiError, definirJetons, effacerJetons, estConnecte } from '@dgap/api-client'

export interface Profil {
  id: string
  email: string
  nom: string
  prenom: string
  matricule: string | null
  est_agent_interne: boolean
  est_superviseur_national: boolean
  mfa_active: boolean
  mfa_requis: boolean
  scopes: string[]
  perimetres: string[]
}

interface ReponseConnexion {
  access: string
  refresh: string
  utilisateur: Profil
}

interface ContexteAuth {
  utilisateur: Profil | null
  chargement: boolean
  connexion: (email: string, motDePasse: string, codeTotp?: string) => Promise<void>
  deconnexion: () => void
  possedeScope: (scope: string) => boolean
  rafraichirProfil: () => Promise<void>
}

const Contexte = createContext<ContexteAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Profil | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!estConnecte()) {
      setChargement(false)
      return
    }
    requeteApi<Profil>('/auth/moi')
      .then(setUtilisateur)
      .catch(() => effacerJetons())
      .finally(() => setChargement(false))
  }, [])

  const connexion = useCallback(async (email: string, motDePasse: string, codeTotp?: string) => {
    const reponse = await requeteApi<ReponseConnexion>('/auth/connexion', {
      method: 'POST',
      body: JSON.stringify({ email, password: motDePasse, code_totp: codeTotp ?? '' }),
    })
    definirJetons({ access: reponse.access, refresh: reponse.refresh })
    setUtilisateur(reponse.utilisateur)
  }, [])

  const deconnexion = useCallback(() => {
    effacerJetons()
    setUtilisateur(null)
  }, [])

  const possedeScope = useCallback(
    (scope: string) =>
      Boolean(utilisateur?.est_superviseur_national || utilisateur?.scopes.includes(scope)),
    [utilisateur],
  )

  const rafraichirProfil = useCallback(async () => {
    setUtilisateur(await requeteApi<Profil>('/auth/moi'))
  }, [])

  return (
    <Contexte.Provider
      value={{ utilisateur, chargement, connexion, deconnexion, possedeScope, rafraichirProfil }}
    >
      {children}
    </Contexte.Provider>
  )
}

export function useAuth(): ContexteAuth {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useAuth doit être utilisé sous <AuthProvider>')
  return contexte
}

export { ApiError }
