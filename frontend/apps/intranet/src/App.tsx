import { Routes, Route, useLocation } from 'react-router-dom'
import { EnTeteEtat, PiedDePage } from '@dgap/ui'
import { Accueil } from './pages/Accueil'

const liensNav = [
  { libelle: 'Tableau de bord', href: '/' },
  { libelle: 'Notes de service', href: '/notes-de-service' },
  { libelle: 'Congés', href: '/rh/conges' },
  { libelle: 'Annuaire interne', href: '/annuaire' },
]

export function App() {
  const { pathname } = useLocation()
  const liens = liensNav.map((lien) => ({ ...lien, actif: pathname === lien.href }))

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-bouton focus:bg-white focus:px-4 focus:py-2 focus:text-primary"
      >
        Aller au contenu principal
      </a>
      <EnTeteEtat liens={liens} />
      <main id="contenu-principal" className="flex-1">
        <Routes>
          <Route path="/" element={<Accueil />} />
        </Routes>
      </main>
      <PiedDePage />
    </div>
  )
}
