import { Routes, Route, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { EnTeteEtat, PiedDePage } from '@dgap/ui'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RouteProtegee } from './auth/RouteProtegee'
import { Connexion } from './pages/Connexion'
import { ConfigurerMFA } from './pages/ConfigurerMFA'
import { Accueil } from './pages/Accueil'
import { NotesDeService } from './pages/NotesDeService'
import { MonDossier } from './pages/MonDossier'
import { Demandes } from './pages/Demandes'
import { Annuaire } from './pages/Annuaire'

const liensNav = [
  { libelle: 'Tableau de bord', href: '/' },
  { libelle: 'Notes de service', href: '/notes-de-service' },
  { libelle: 'Mon dossier', href: '/rh/mon-dossier' },
  { libelle: 'Mes demandes', href: '/rh/conges' },
  { libelle: 'Annuaire interne', href: '/annuaire' },
]

function EnTete() {
  const { pathname } = useLocation()
  const { utilisateur, deconnexion } = useAuth()
  const liens = liensNav.map((lien) => ({ ...lien, actif: pathname === lien.href }))

  return (
    <EnTeteEtat
      liens={liens}
      actions={
        utilisateur ? (
          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            <span className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
              {utilisateur.prenom} {utilisateur.nom}
            </span>
            <button
              type="button"
              onClick={deconnexion}
              aria-label="Se déconnecter"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-strong
                         transition-colors duration-200 ease-dgap hover:bg-surface-tint
                         dark:text-text-inv-strong dark:hover:bg-white/10
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        ) : undefined
      }
    />
  )
}

function AppRoutes() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-bouton focus:bg-white focus:px-4 focus:py-2 focus:text-primary"
      >
        Aller au contenu principal
      </a>
      <EnTete />
      <main id="contenu-principal" className="flex-1">
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route
            path="/configurer-mfa"
            element={
              <RouteProtegeeSansMfa>
                <ConfigurerMFA />
              </RouteProtegeeSansMfa>
            }
          />
          <Route
            path="/"
            element={
              <RouteProtegee>
                <Accueil />
              </RouteProtegee>
            }
          />
          <Route
            path="/notes-de-service"
            element={
              <RouteProtegee>
                <NotesDeService />
              </RouteProtegee>
            }
          />
          <Route
            path="/rh/mon-dossier"
            element={
              <RouteProtegee>
                <MonDossier />
              </RouteProtegee>
            }
          />
          <Route
            path="/rh/conges"
            element={
              <RouteProtegee>
                <Demandes />
              </RouteProtegee>
            }
          />
          <Route
            path="/annuaire"
            element={
              <RouteProtegee>
                <Annuaire />
              </RouteProtegee>
            }
          />
        </Routes>
      </main>
      <PiedDePage />
    </div>
  )
}

/** /configurer-mfa doit rester accessible même sans MFA active (c'est son objet) —
 * seule l'authentification de base est requise, pas la vérification MFA complète. */
function RouteProtegeeSansMfa({ children }: { children: React.ReactNode }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return null
  if (!utilisateur) return <Connexion />
  return <>{children}</>
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
