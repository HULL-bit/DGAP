import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Badge, ChampTexte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { ActionAudit, JournalActionEntree, Pagination } from '../types/api'
import { LIBELLES_ACTION_AUDIT } from '../types/api'

const TON_PAR_ACTION: Record<ActionAudit, TonBadge> = {
  CONSULTER: 'neutre',
  CREER: 'succes',
  MODIFIER: 'attente',
  VALIDER: 'succes',
  REJETER: 'erreur',
  EXPORTER: 'attente',
  ACCES_REFUSE: 'erreur',
}

export function JournalAudit() {
  const [ressourceType, setRessourceType] = useState('')
  const [action, setAction] = useState('')
  const [depuis, setDepuis] = useState('')
  const [jusquA, setJusquA] = useState('')

  const params = new URLSearchParams()
  if (ressourceType) params.set('ressource_type', ressourceType)
  if (action) params.set('action', action)
  if (depuis) params.set('depuis', depuis)
  if (jusquA) params.set('jusqu_a', jusquA)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal-audit', ressourceType, action, depuis, jusquA],
    queryFn: () =>
      requeteApi<Pagination<JournalActionEntree>>(`/backoffice/audit/journal?${params.toString()}`),
  })

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="flex items-center gap-2 font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          <ScrollText size={22} aria-hidden="true" />
          Journal d'audit
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Journal central inaltérable de toutes les actions significatives — consultation habilitée.
        </p>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChampTexte etiquette="Type de ressource" value={ressourceType} onChange={(e) => setRessourceType(e.target.value)} placeholder="ex. courrier" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="action-filtre" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
            Action
          </label>
          <select
            id="action-filtre"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                       dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
          >
            <option value="">Toutes</option>
            {(Object.entries(LIBELLES_ACTION_AUDIT) as [ActionAudit, string][]).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
        </div>
        <ChampTexte etiquette="Depuis" type="date" value={depuis} onChange={(e) => setDepuis(e.target.value)} />
        <ChampTexte etiquette="Jusqu'au" type="date" value={jusquA} onChange={(e) => setJusquA(e.target.value)} />
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger le journal.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((entree) => (
          <motion.div key={entree.id} variants={elementEnCascade} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="font-corps text-sm text-text-body dark:text-text-inv-body">
                <span className="font-semibold">{entree.acteur_nom || 'Système'}</span> ·{' '}
                {entree.ressource_type}
                {entree.ressource_id && `#${entree.ressource_id}`}
              </p>
              <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                {new Date(entree.horodatage).toLocaleString('fr-SN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {entree.adresse_ip && ` · ${entree.adresse_ip}`}
              </p>
            </div>
            <Badge ton={TON_PAR_ACTION[entree.action]} libelle={LIBELLES_ACTION_AUDIT[entree.action]} />
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune entrée.</p>
        )}
      </motion.div>
    </section>
  )
}
