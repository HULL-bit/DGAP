import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RouteProtegee({ children, scope }: { children: ReactNode; scope?: string }) {
  const { utilisateur, chargement, possedeScope } = useAuth()
  const location = useLocation()

  if (chargement) return null
  if (!utilisateur) return <Navigate to="/connexion" state={{ depuis: location.pathname }} replace />
  if (utilisateur.mfa_requis && !utilisateur.mfa_active && location.pathname !== '/configurer-mfa') {
    return <Navigate to="/configurer-mfa" replace />
  }
  if (scope && !possedeScope(scope)) {
    return (
      <div className="mx-auto max-w-conteneur px-6 py-16 text-center">
        <p className="font-corps text-text-body dark:text-text-inv-body">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
