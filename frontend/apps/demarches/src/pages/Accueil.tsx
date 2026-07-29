import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, CalendarDays, GraduationCap } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { CarteAction, Carte, Bouton } from '@dgap/ui'
import type { Concours, Pagination } from '../types/api'

/**
 * Accueil « Démarches » — entrée + liens vers les deux téléservices
 * prioritaires, plus un aperçu en direct des concours actuellement ouverts
 * (§7.4) : un citoyen ne doit pas avoir à deviner qu'un concours existe en
 * passant par la page de liste, il le voit dès l'accueil.
 */
export function Accueil() {
  const { data } = useQuery({
    queryKey: ['accueil-concours-ouverts'],
    queryFn: () => requeteApi<Pagination<Concours>>('/concours?limit=3'),
  })

  const concoursOuverts = data?.results ?? []

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

      {concoursOuverts.length > 0 && (
        <div className="mt-14">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-titre text-xl font-bold text-text-strong">Concours actuellement ouverts</h2>
            <Link to="/concours" className="font-corps text-sm font-medium text-primary hover:underline">
              Voir tous les concours
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {concoursOuverts.map((concours) => (
              <Carte key={concours.id} className="flex h-full flex-col">
                <h3 className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                  {concours.titre}
                </h3>
                <p className="mt-2 flex items-center gap-1.5 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  <CalendarDays size={14} aria-hidden="true" />
                  Clôture le{' '}
                  {new Date(concours.date_cloture).toLocaleDateString('fr-SN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <Link to={`/concours/${concours.code}/inscription`} className="mt-4">
                  <Bouton taille="sm">S'inscrire</Bouton>
                </Link>
              </Carte>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
