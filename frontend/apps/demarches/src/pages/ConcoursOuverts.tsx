import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarDays, GraduationCap } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Carte, Bouton, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { Concours, Pagination } from '../types/api'

export function ConcoursOuverts() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['concours-ouverts'],
    queryFn: () => requeteApi<Pagination<Concours>>('/concours'),
  })

  const concoursListe = data?.results ?? []

  return (
    <>
      <Helmet>
        <title>Concours — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Consultez les avis de concours ouverts et déposez votre candidature en ligne."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Concours
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Consultez les avis de concours ouverts et déposez votre candidature en ligne.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-12 sm:px-8">
        {isLoading && <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
        {isError && (
          <p className="font-corps text-sm text-error">Impossible de charger les concours pour le moment.</p>
        )}

        <motion.div
          className="grid gap-5 sm:grid-cols-2"
          variants={conteneurEnCascade()}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {concoursListe.map((concours) => (
            <motion.div key={concours.id} variants={elementEnCascade}>
              <Carte className="flex h-full flex-col">
                <div className="flex items-center gap-2 text-primary dark:text-accent-soft">
                  <GraduationCap size={20} aria-hidden="true" />
                  <span className="font-corps text-xs font-semibold uppercase tracking-wide">Concours</span>
                </div>
                <h2 className="mt-2 font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">
                  {concours.titre}
                </h2>
                {concours.description && (
                  <p className="mt-2 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                    {concours.description}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1.5 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  <CalendarDays size={14} aria-hidden="true" />
                  Clôture le{' '}
                  {new Date(concours.date_cloture).toLocaleDateString('fr-SN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {Number(concours.frais_inscription) > 0 && (
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    Frais d'inscription : {concours.frais_inscription} FCFA
                  </p>
                )}
                <Link to={`/concours/${concours.code}/inscription`} className="mt-4">
                  <Bouton taille="sm">S'inscrire</Bouton>
                </Link>
              </Carte>
            </motion.div>
          ))}
        </motion.div>

        {!isLoading && concoursListe.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Aucun concours n'est ouvert pour le moment.
          </p>
        )}
      </section>
    </>
  )
}
