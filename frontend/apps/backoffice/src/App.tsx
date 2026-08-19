import { Routes, Route, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { EnTeteEtat, PiedDePage } from '@dgap/ui'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RouteProtegee } from './auth/RouteProtegee'
import { Connexion } from './pages/Connexion'
import { MotDePasseOublie } from './pages/MotDePasseOublie'
import { ReinitialiserMotDePasse } from './pages/ReinitialiserMotDePasse'
import { ConfigurerMFA } from './pages/ConfigurerMFA'
import { ArticlesListe } from './pages/ArticlesListe'
import { ArticleEditeur } from './pages/ArticleEditeur'
import { VisitesListe } from './pages/VisitesListe'
import { VisiteInstruction } from './pages/VisiteInstruction'
import { GaleriesListe } from './pages/GaleriesListe'
import { GalerieEditeur } from './pages/GalerieEditeur'
import { ConcoursListe } from './pages/ConcoursListe'
import { ConcoursEditeur } from './pages/ConcoursEditeur'
import { CandidaturesListe } from './pages/CandidaturesListe'
import { CandidatureInstruction } from './pages/CandidatureInstruction'
import { DocumentsListe } from './pages/DocumentsListe'
import { DocumentEditeur } from './pages/DocumentEditeur'
import { ProduitsListe } from './pages/ProduitsListe'
import { ProduitEditeur } from './pages/ProduitEditeur'
import { Statistiques } from './pages/Statistiques'
import { Notifications } from './pages/Notifications'
import { CourrierListe } from './pages/CourrierListe'
import { CourrierDetail } from './pages/CourrierDetail'
import { GedListe } from './pages/GedListe'
import { GedDetail } from './pages/GedDetail'
import { GedPartage } from './pages/GedPartage'
import { RhDossiers } from './pages/RhDossiers'
import { RhDossierDetail } from './pages/RhDossierDetail'
import { Comptes } from './pages/Comptes'
import { CompteDetail } from './pages/CompteDetail'
import { Roles } from './pages/Roles'
import { JournalAudit } from './pages/JournalAudit'
import { DetenusListe } from './pages/DetenusListe'
import { DetenusDetail } from './pages/DetenusDetail'
import { Interop } from './pages/Interop'

// `scope: null` = visible à tout agent connecté, quel que soit son rôle (même
// garde que la route correspondante, cf. absence de prop `scope` sur sa
// `<RouteProtegee>`). Un lien dont l'agent n'a pas le scope n'est pas affiché
// du tout (pas seulement bloqué au clic) — l'agent ne doit même pas voir les
// modules hors de son rôle.
const liensNav: { libelle: string; href: string; scope: string | null }[] = [
  { libelle: 'Éditorial', href: '/', scope: null },
  { libelle: 'Galeries', href: '/galeries', scope: 'contenus:rediger' },
  { libelle: 'Documents officiels', href: '/documents', scope: 'documents:gerer' },
  { libelle: 'Boutique', href: '/boutique', scope: 'boutique:gerer' },
  { libelle: 'Instruction visites', href: '/visites', scope: 'visites:instruire' },
  { libelle: 'Campagnes concours', href: '/concours', scope: 'concours:gerer' },
  { libelle: 'Candidatures', href: '/candidatures', scope: 'concours:instruire' },
  { libelle: 'Courrier', href: '/courrier', scope: 'courrier:gerer' },
  { libelle: 'GED', href: '/ged', scope: 'ged:consulter' },
  { libelle: 'RH', href: '/rh/dossiers', scope: 'rh:gerer' },
  { libelle: 'Comptes', href: '/comptes', scope: 'comptes:gerer' },
  { libelle: 'Rôles', href: '/roles', scope: 'comptes:gerer' },
  { libelle: 'Journal d’audit', href: '/audit', scope: 'audit:consulter' },
  { libelle: 'Dossier détenu', href: '/detenus', scope: 'detenus:consulter' },
  { libelle: 'Interconnexion', href: '/interop', scope: 'interop:consulter' },
  { libelle: 'Statistiques', href: '/statistiques', scope: 'stats:lire' },
  { libelle: 'Notifications', href: '/notifications', scope: 'notifications:lire' },
]

function EnTete() {
  const { pathname } = useLocation()
  const { utilisateur, deconnexion, possedeScope } = useAuth()
  const liens = liensNav
    .filter((lien) => lien.scope === null || possedeScope(lien.scope))
    .map((lien) => ({ ...lien, actif: pathname === lien.href }))

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
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
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
                <ArticlesListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/articles/:id"
            element={
              <RouteProtegee>
                <ArticleEditeur />
              </RouteProtegee>
            }
          />
          <Route
            path="/galeries"
            element={
              <RouteProtegee scope="contenus:rediger">
                <GaleriesListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/galeries/:id"
            element={
              <RouteProtegee scope="contenus:rediger">
                <GalerieEditeur />
              </RouteProtegee>
            }
          />
          <Route
            path="/documents"
            element={
              <RouteProtegee scope="documents:gerer">
                <DocumentsListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <RouteProtegee scope="documents:gerer">
                <DocumentEditeur />
              </RouteProtegee>
            }
          />
          <Route
            path="/boutique"
            element={
              <RouteProtegee scope="boutique:gerer">
                <ProduitsListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/boutique/:id"
            element={
              <RouteProtegee scope="boutique:gerer">
                <ProduitEditeur />
              </RouteProtegee>
            }
          />
          <Route
            path="/visites"
            element={
              <RouteProtegee scope="visites:instruire">
                <VisitesListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/visites/:id"
            element={
              <RouteProtegee scope="visites:instruire">
                <VisiteInstruction />
              </RouteProtegee>
            }
          />
          <Route
            path="/concours"
            element={
              <RouteProtegee scope="concours:gerer">
                <ConcoursListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/concours/:id"
            element={
              <RouteProtegee scope="concours:gerer">
                <ConcoursEditeur />
              </RouteProtegee>
            }
          />
          <Route
            path="/candidatures"
            element={
              <RouteProtegee scope="concours:instruire">
                <CandidaturesListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/candidatures/:id"
            element={
              <RouteProtegee scope="concours:instruire">
                <CandidatureInstruction />
              </RouteProtegee>
            }
          />
          <Route
            path="/statistiques"
            element={
              <RouteProtegee scope="stats:lire">
                <Statistiques />
              </RouteProtegee>
            }
          />
          <Route
            path="/notifications"
            element={
              <RouteProtegee scope="notifications:lire">
                <Notifications />
              </RouteProtegee>
            }
          />
          <Route
            path="/courrier"
            element={
              <RouteProtegee scope="courrier:gerer">
                <CourrierListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/courrier/:id"
            element={
              <RouteProtegee scope="courrier:gerer">
                <CourrierDetail />
              </RouteProtegee>
            }
          />
          <Route
            path="/ged"
            element={
              <RouteProtegee scope="ged:consulter">
                <GedListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/ged/partage/:jeton"
            element={
              <RouteProtegee scope="ged:consulter">
                <GedPartage />
              </RouteProtegee>
            }
          />
          <Route
            path="/ged/:id"
            element={
              <RouteProtegee scope="ged:consulter">
                <GedDetail />
              </RouteProtegee>
            }
          />
          <Route
            path="/rh/dossiers"
            element={
              <RouteProtegee scope="rh:gerer">
                <RhDossiers />
              </RouteProtegee>
            }
          />
          <Route
            path="/rh/dossiers/:id"
            element={
              <RouteProtegee scope="rh:gerer">
                <RhDossierDetail />
              </RouteProtegee>
            }
          />
          <Route
            path="/comptes"
            element={
              <RouteProtegee scope="comptes:gerer">
                <Comptes />
              </RouteProtegee>
            }
          />
          <Route
            path="/comptes/:id"
            element={
              <RouteProtegee scope="comptes:gerer">
                <CompteDetail />
              </RouteProtegee>
            }
          />
          <Route
            path="/roles"
            element={
              <RouteProtegee scope="comptes:gerer">
                <Roles />
              </RouteProtegee>
            }
          />
          <Route
            path="/audit"
            element={
              <RouteProtegee scope="audit:consulter">
                <JournalAudit />
              </RouteProtegee>
            }
          />
          <Route
            path="/detenus"
            element={
              <RouteProtegee scope="detenus:consulter">
                <DetenusListe />
              </RouteProtegee>
            }
          />
          <Route
            path="/detenus/:id"
            element={
              <RouteProtegee scope="detenus:consulter">
                <DetenusDetail />
              </RouteProtegee>
            }
          />
          <Route
            path="/interop"
            element={
              <RouteProtegee scope="interop:consulter">
                <Interop />
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
