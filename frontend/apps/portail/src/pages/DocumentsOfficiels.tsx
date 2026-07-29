import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, FileText, Search } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { DocumentOfficiel, Pagination } from '../types/api'
import { LIBELLES_NATURE_DOCUMENT } from '../types/api'

const LIBELLES_CATEGORIES: Record<string, string> = {
  'textes-juridiques': 'Textes juridiques',
  concours: 'Concours',
  statistiques: 'Statistiques',
}

export function DocumentsOfficiels() {
  const [recherche, setRecherche] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents-officiels'],
    queryFn: () => requeteApi<Pagination<DocumentOfficiel>>('/documents?limit=100'),
  })

  const parCategorie = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    const filtres = (data?.results ?? []).filter((d) => !terme || d.titre.toLowerCase().includes(terme))
    const groupes = new Map<string, DocumentOfficiel[]>()
    for (const document of filtres) {
      const cle = document.categorie || 'autres'
      const liste = groupes.get(cle) ?? []
      liste.push(document)
      groupes.set(cle, liste)
    }
    return groupes
  }, [data, recherche])

  return (
    <>
      <Helmet>
        <title>Documents officiels — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Textes juridiques, avis de concours et publications officielles de la Direction Générale de l'Administration Pénitentiaire."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Documents officiels
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Textes juridiques, avis de concours et publications officielles, téléchargeables librement.
            </p>
            <div className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 dark:border-border-dark dark:bg-surface-dark-alt">
              <Search size={18} aria-hidden="true" className="text-text-muted dark:text-text-inv-muted" />
              <label htmlFor="recherche-documents" className="sr-only">
                Rechercher un document
              </label>
              <input
                id="recherche-documents"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un document…"
                className="w-full bg-transparent font-corps text-sm text-text-body outline-none placeholder:text-text-muted
                           dark:text-text-inv-body dark:placeholder:text-text-inv-muted"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
        {isLoading && <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
        {isError && <p className="font-corps text-sm text-error">Impossible de charger les documents.</p>}

        <div className="flex flex-col gap-12">
          {Array.from(parCategorie.entries()).map(([categorie, documents]) => (
            <div key={categorie}>
              <h2 className="font-titre text-xl font-bold text-text-strong dark:text-text-inv-strong">
                {LIBELLES_CATEGORIES[categorie] ?? categorie}
              </h2>
              <motion.div
                className="mt-4 grid gap-4 sm:grid-cols-2"
                variants={conteneurEnCascade()}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {documents.map((document) => (
                  <motion.div
                    key={document.id}
                    variants={elementEnCascade}
                    className="flex items-center gap-4 rounded-carte border border-border bg-white p-5 shadow-legere dark:border-border-dark dark:bg-surface-dark-alt"
                  >
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-white/10 dark:text-accent-soft">
                      <FileText size={22} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-corps text-xs font-semibold uppercase tracking-wide text-primary dark:text-accent-soft">
                        {LIBELLES_NATURE_DOCUMENT[document.nature]}
                      </p>
                      <p className="mt-0.5 truncate font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                        {document.titre}
                      </p>
                      {document.date_texte && (
                        <time dateTime={document.date_texte} className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                          {new Date(document.date_texte).toLocaleDateString('fr-SN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </time>
                      )}
                    </div>
                    {document.fichier_url ? (
                      <a
                        href={document.fichier_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Télécharger : ${document.titre}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary
                                   transition-colors duration-200 ease-dgap hover:bg-primary hover:text-white
                                   dark:text-accent-soft dark:hover:bg-accent-soft dark:hover:text-primary-dark
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Download size={18} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="shrink-0 font-corps text-xs text-text-muted dark:text-text-inv-muted">À venir</span>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}

          {!isLoading && parCategorie.size === 0 && (
            <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun document publié pour le moment.</p>
          )}
        </div>
      </section>
    </>
  )
}
