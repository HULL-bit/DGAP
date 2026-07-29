import { Routes, Route, useLocation } from 'react-router-dom'
import { EnTeteEtat, PiedDePage } from '@dgap/ui'
import { Accueil } from './pages/Accueil'
import { VisiteNouvelle } from './pages/VisiteNouvelle'
import { VisiteSuivi } from './pages/VisiteSuivi'
import { ConcoursOuverts } from './pages/ConcoursOuverts'
import { CandidatureNouvelle } from './pages/CandidatureNouvelle'
import { CandidatureSuivi } from './pages/CandidatureSuivi'

const liensNav = [
  { libelle: 'Accueil', href: '/' },
  { libelle: 'Demande de visite', href: '/visites/nouvelle' },
  { libelle: 'Suivi de demande', href: '/visites/suivi' },
  { libelle: 'Concours', href: '/concours' },
  { libelle: 'Suivi candidature', href: '/concours/suivi' },
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
          <Route path="/visites/nouvelle" element={<VisiteNouvelle />} />
          <Route path="/visites/suivi" element={<VisiteSuivi />} />
          <Route path="/concours" element={<ConcoursOuverts />} />
          <Route path="/concours/suivi" element={<CandidatureSuivi />} />
          <Route path="/concours/:code/inscription" element={<CandidatureNouvelle />} />
        </Routes>
      </main>
      <PiedDePage />
    </div>
  )
}
