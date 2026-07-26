import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { propsApparition } from '@dgap/ui'
import type { FAQ } from '../types/api'

const LIBELLES_CATEGORIES: Record<string, string> = {
  visites: 'Visites',
  concours: 'Concours',
  contact: 'Contact',
  horaires: 'Horaires',
  pieces: 'Pièces justificatives',
  reinsertion: 'Réinsertion',
  general: 'Général',
  annuaire: 'Annuaire des établissements',
  comptes: 'Comptes et connexion',
  accessibilite: 'Accessibilité',
}

export function FaqPage() {
  const [recherche, setRecherche] = useState('')
  const [ouverte, setOuverte] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: () => requeteApi<FAQ[]>('/faq'),
  })

  const parCategorie = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    const filtrees = (data ?? []).filter(
      (q) => !terme || q.question.toLowerCase().includes(terme) || q.reponse.toLowerCase().includes(terme),
    )
    const groupes = new Map<string, FAQ[]>()
    for (const question of filtrees) {
      const liste = groupes.get(question.categorie) ?? []
      liste.push(question)
      groupes.set(question.categorie, liste)
    }
    return groupes
  }, [data, recherche])

  return (
    <>
      <Helmet>
        <title>FAQ — Direction Générale de l'Administration Pénitentiaire</title>
        <meta name="description" content="Questions fréquentes sur les visites, concours, contact et démarches auprès de la DGAP." />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Foire aux questions
            </h1>
            <div className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 dark:border-border-dark dark:bg-surface-dark-alt">
              <Search size={18} aria-hidden="true" className="text-text-muted dark:text-text-inv-muted" />
              <label htmlFor="recherche-faq" className="sr-only">
                Rechercher dans la FAQ
              </label>
              <input
                id="recherche-faq"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une question…"
                className="w-full bg-transparent font-corps text-sm text-text-body outline-none placeholder:text-text-muted
                           dark:text-text-inv-body dark:placeholder:text-text-inv-muted"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
        {isLoading && <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}

        <div className="flex flex-col gap-10">
          {Array.from(parCategorie.entries()).map(([categorie, questions]) => (
            <div key={categorie}>
              <h2 className="font-titre text-xl font-bold text-text-strong dark:text-text-inv-strong">
                {LIBELLES_CATEGORIES[categorie] ?? categorie}
              </h2>
              <div className="mt-4 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt">
                {questions.map((q) => {
                  const estOuverte = ouverte === q.id
                  return (
                    <div key={q.id}>
                      <button
                        type="button"
                        onClick={() => setOuverte(estOuverte ? null : q.id)}
                        aria-expanded={estOuverte}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-corps text-sm font-medium text-text-strong
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-text-inv-strong"
                      >
                        {q.question}
                        <ChevronDown
                          size={18}
                          aria-hidden="true"
                          className={`shrink-0 transition-transform duration-200 ease-dgap ${estOuverte ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {estOuverte && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-4 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                              {q.reponse}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
