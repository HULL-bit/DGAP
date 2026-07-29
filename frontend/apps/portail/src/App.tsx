import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EnTeteEtat, PiedDePage } from '@dgap/ui'
import { definirLangue, type Langue } from '@dgap/i18n'
import { Accueil } from './pages/Accueil'

// Code-splitting par route (§9.1) : seule l'Accueil est chargée d'emblée. La carte
// MapLibre (Annuaire) notamment ne doit jamais alourdir le bundle initial du portail.
const APropos = lazy(() => import('./pages/APropos').then((m) => ({ default: m.APropos })))
const VieDesDetenus = lazy(() => import('./pages/VieDesDetenus').then((m) => ({ default: m.VieDesDetenus })))
const ReinsertionIndex = lazy(() =>
  import('./pages/ReinsertionIndex').then((m) => ({ default: m.ReinsertionIndex })),
)
const ReinsertionCategorie = lazy(() =>
  import('./pages/ReinsertionCategorie').then((m) => ({ default: m.ReinsertionCategorie })),
)
const Annuaire = lazy(() => import('./pages/Annuaire').then((m) => ({ default: m.Annuaire })))
const Actualites = lazy(() => import('./pages/Actualites').then((m) => ({ default: m.Actualites })))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail').then((m) => ({ default: m.ArticleDetail })))
const DocumentsOfficiels = lazy(() =>
  import('./pages/DocumentsOfficiels').then((m) => ({ default: m.DocumentsOfficiels })),
)
const Boutique = lazy(() => import('./pages/Boutique').then((m) => ({ default: m.Boutique })))
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })))
const FaqPage = lazy(() => import('./pages/FaqPage').then((m) => ({ default: m.FaqPage })))

function ChargementPage() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>
    </div>
  )
}

export function App() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()

  const liensNav = [
    { libelle: t('nav.accueil'), href: '/' },
    { libelle: t('nav.aPropos'), href: '/a-propos' },
    { libelle: t('nav.vieDesDetenus'), href: '/vie-des-detenus' },
    { libelle: t('nav.actualites'), href: '/actualite' },
    { libelle: t('nav.reinsertion'), href: '/reinsertion' },
    { libelle: t('nav.publications'), href: '/publications' },
    { libelle: t('nav.boutique'), href: '/boutique' },
    { libelle: t('nav.annuaire'), href: '/annuaire' },
    { libelle: t('nav.faq'), href: '/faq' },
    { libelle: t('nav.contact'), href: '/contact' },
  ]
  const liens = liensNav.map((lien) => ({
    ...lien,
    actif: lien.href === '/' ? pathname === '/' : pathname.startsWith(lien.href),
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-bouton focus:bg-white focus:px-4 focus:py-2 focus:text-primary"
      >
        Aller au contenu principal
      </a>
      <EnTeteEtat
        liens={liens}
        onRecherche={(terme) => console.info('recherche', terme)}
        langue={i18n.language === 'en' ? 'en' : 'fr'}
        onChangerLangue={(l: Langue) => definirLangue(l)}
      />
      <main id="contenu-principal" className="flex-1">
        <Suspense fallback={<ChargementPage />}>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/vie-des-detenus" element={<VieDesDetenus />} />
            <Route path="/reinsertion" element={<ReinsertionIndex />} />
            <Route path="/reinsertion/:slug" element={<ReinsertionCategorie />} />
            <Route path="/annuaire" element={<Annuaire />} />
            <Route path="/actualite" element={<Actualites />} />
            <Route path="/actualite/:slug" element={<ArticleDetail />} />
            <Route path="/publications" element={<DocumentsOfficiels />} />
            <Route path="/boutique" element={<Boutique />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FaqPage />} />
          </Routes>
        </Suspense>
      </main>
      <PiedDePage />
    </div>
  )
}
