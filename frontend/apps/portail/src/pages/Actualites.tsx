import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { requeteApi } from '@dgap/api-client'
import { propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { ArticleListe, Pagination } from '../types/api'

export function Actualites() {
  const [pages, setPages] = useState<ArticleListe[]>([])
  const [urlSuivante, setUrlSuivante] = useState<string | null>(null)
  const [chargementSuivant, setChargementSuivant] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const reponse = await requeteApi<Pagination<ArticleListe>>('/articles')
      setPages(reponse.results)
      setUrlSuivante(reponse.next)
      return reponse
    },
  })

  async function chargerPlus() {
    if (!urlSuivante) return
    setChargementSuivant(true)
    try {
      const reponse = await fetch(urlSuivante, { credentials: 'include' })
      const donnees = (await reponse.json()) as Pagination<ArticleListe>
      setPages((precedent) => [...precedent, ...donnees.results])
      setUrlSuivante(donnees.next)
    } finally {
      setChargementSuivant(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Actualité — Direction Générale de l'Administration Pénitentiaire</title>
        <meta name="description" content="Toute l'actualité de la Direction Générale de l'Administration Pénitentiaire." />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Actualité
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
        {isLoading && <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
        {isError && <p className="font-corps text-sm text-error">Impossible de charger les actualités.</p>}

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={conteneurEnCascade()}
          initial="hidden"
          animate="visible"
        >
          {(data ? pages : []).map((article) => (
            <motion.article
              key={article.id}
              variants={elementEnCascade}
              className="overflow-hidden rounded-carte border border-border bg-white shadow-legere transition-shadow duration-200 ease-dgap hover:shadow-portee
                         dark:border-border-dark dark:bg-surface-dark-alt"
            >
              <div className="h-1.5 bg-gradient-to-r from-primary to-accent" aria-hidden="true" />
              <div className="p-5">
                {article.date_publication && (
                  <time dateTime={article.date_publication} className="font-corps text-xs font-medium text-text-muted dark:text-text-inv-muted">
                    {new Date(article.date_publication).toLocaleDateString('fr-SN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                )}
                <Link
                  to={`/actualite/${article.slug}`}
                  className="mt-2 block font-corps text-base font-semibold leading-snug text-text-strong hover:text-primary
                             dark:text-text-inv-strong dark:hover:text-accent-soft
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {article.titre}
                </Link>
                {article.chapo && (
                  <p className="mt-2 line-clamp-3 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                    {article.chapo}
                  </p>
                )}
              </div>
            </motion.article>
          ))}
        </motion.div>

        {urlSuivante && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={chargerPlus}
              disabled={chargementSuivant}
              className="rounded-full border border-border bg-white px-5 py-2.5 font-corps text-sm font-semibold text-text-strong
                         transition-colors duration-200 ease-dgap hover:bg-surface-tint disabled:opacity-50
                         dark:border-border-dark dark:bg-surface-dark-alt dark:text-text-inv-strong
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {chargementSuivant ? 'Chargement…' : 'Charger plus d’actualités'}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
