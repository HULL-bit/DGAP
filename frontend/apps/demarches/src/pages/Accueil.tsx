import { CalendarCheck, GraduationCap } from 'lucide-react'
import { CarteAction } from '@dgap/ui'

/**
 * Accueil « Démarches » — socle Phase 0. Les parcours complets (formulaire multi-étapes
 * §7.3, espace candidat §7.4) sont livrés au Bloc D/E. Ici : entrée + liens vers les
 * deux téléservices prioritaires, cohérente avec la charte du portail (@dgap/ui).
 */
export function Accueil() {
  return (
    <section className="mx-auto max-w-conteneur px-6 py-16">
      <h1 className="font-titre text-3xl font-bold text-text-strong">Vos démarches en ligne</h1>
      <p className="mt-3 max-w-xl font-corps text-lg text-text-muted">
        Déposez et suivez vos démarches auprès de l'Administration Pénitentiaire.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <CarteAction
          icone={CalendarCheck}
          titre="Demander une visite"
          description="Formulaire en 6 étapes, numéro de suivi, notifications par SMS/email."
          href="/visites/nouvelle"
        />
        <CarteAction
          icone={GraduationCap}
          titre="S'inscrire à un concours"
          description="Avis de concours, dépôt de dossier, convocation et résultats."
          href="/concours"
        />
      </div>
    </section>
  )
}
