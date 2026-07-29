import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mail, Phone, User } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { AgentAnnuaire, Pagination } from '../types/api'

export function Annuaire() {
  const [recherche, setRecherche] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rh-annuaire', recherche],
    queryFn: () =>
      requeteApi<Pagination<AgentAnnuaire>>(
        `/rh/annuaire${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`,
      ),
  })

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.h1
        className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong"
        {...propsApparition()}
      >
        Annuaire interne
      </motion.h1>
      <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
        Recherchez un agent par nom, corps ou grade.
      </p>

      <div className="mt-6 max-w-md">
        <ChampTexte
          etiquette="Rechercher"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger l'annuaire.</p>}

      <motion.div
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((agent) => (
          <motion.div key={agent.id} variants={elementEnCascade}>
            <Carte className="h-full">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                  <User size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {agent.nom}
                  </p>
                  <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {agent.fonction_actuelle || agent.grade || agent.corps || '—'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                {agent.perimetre_actuel_libelle && <p>{agent.perimetre_actuel_libelle}</p>}
                <p className="flex items-center gap-1.5">
                  <Mail size={12} aria-hidden="true" />
                  {agent.email}
                </p>
                {agent.telephone && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} aria-hidden="true" />
                    {agent.telephone}
                  </p>
                )}
              </div>
            </Carte>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun agent trouvé.</p>
        )}
      </motion.div>
    </section>
  )
}
