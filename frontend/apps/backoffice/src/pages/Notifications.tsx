import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, Mail, MessageSquare } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Badge, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { CanalNotification, NotificationEnvoyee, Pagination, StatutNotification } from '../types/api'

const FILTRES_CANAL: { valeur: CanalNotification | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous les canaux' },
  { valeur: 'EMAIL', libelle: 'E-mail' },
  { valeur: 'SMS', libelle: 'SMS' },
]

const FILTRES_STATUT: { valeur: StatutNotification | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous les statuts' },
  { valeur: 'ENVOYE', libelle: 'Envoyé' },
  { valeur: 'ECHEC', libelle: 'Échec' },
]

const TON_PAR_STATUT: Record<StatutNotification, TonBadge> = {
  ENVOYE: 'succes',
  ECHEC: 'erreur',
}

export function Notifications() {
  const [canal, setCanal] = useState<CanalNotification | ''>('')
  const [statut, setStatut] = useState<StatutNotification | ''>('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', canal, statut],
    queryFn: () => {
      const params = new URLSearchParams()
      if (canal) params.set('canal', canal)
      if (statut) params.set('statut', statut)
      const requete = params.toString()
      return requeteApi<Pagination<NotificationEnvoyee>>(
        `/backoffice/notifications${requete ? `?${requete}` : ''}`,
      )
    },
  })

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">Notifications</h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Journal des e-mails et SMS envoyés aux citoyens à chaque changement d'état (visites, concours). Le SMS
          est simulé — aucun connecteur opérateur réel n'est engagé.
        </p>
      </motion.div>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTRES_CANAL.map((f) => (
            <button
              key={f.valeur || 'tous-canaux'}
              type="button"
              onClick={() => setCanal(f.valeur)}
              className={`rounded-full px-3.5 py-2 font-corps text-sm font-semibold transition-colors duration-200 ease-dgap
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                         ${
                           canal === f.valeur
                             ? 'bg-primary text-white'
                             : 'bg-surface-tint text-text-strong hover:bg-surface-muted dark:bg-white/5 dark:text-text-inv-body'
                         }`}
            >
              {f.libelle}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTRES_STATUT.map((f) => (
            <button
              key={f.valeur || 'tous-statuts'}
              type="button"
              onClick={() => setStatut(f.valeur)}
              className={`rounded-full px-3.5 py-2 font-corps text-sm font-semibold transition-colors duration-200 ease-dgap
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                         ${
                           statut === f.valeur
                             ? 'bg-primary text-white'
                             : 'bg-surface-tint text-text-strong hover:bg-surface-muted dark:bg-white/5 dark:text-text-inv-body'
                         }`}
            >
              {f.libelle}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les notifications.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((notification) => (
          <motion.div key={notification.id} variants={elementEnCascade} className="flex items-start gap-3 p-5">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
              {notification.canal === 'EMAIL' ? (
                <Mail size={16} aria-hidden="true" />
              ) : (
                <MessageSquare size={16} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                  {notification.destinataire}
                </p>
                <Badge ton={TON_PAR_STATUT[notification.statut]} libelle={notification.statut === 'ENVOYE' ? 'Envoyé' : 'Échec'} />
              </div>
              {notification.sujet && (
                <p className="mt-1 font-corps text-sm text-text-body dark:text-text-inv-body">{notification.sujet}</p>
              )}
              <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                {new Date(notification.cree_le).toLocaleString('fr-SN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="flex items-center gap-2 p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            <Bell size={16} aria-hidden="true" />
            Aucune notification.
          </p>
        )}
      </motion.div>
    </section>
  )
}
