import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, ShieldAlert } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type {
  DirectionEchange,
  EchangeExterne,
  Pagination,
  RapprochementPaiements,
  StatutEchange,
  SystemeExterne,
} from '../types/api'
import { LIBELLES_SYSTEME_EXTERNE } from '../types/api'

const TON_PAR_STATUT: Record<StatutEchange, TonBadge> = { SUCCES: 'succes', ECHEC: 'erreur' }

interface Formulaire {
  systeme: SystemeExterne
  direction: DirectionEchange
  type_echange: string
  statut: StatutEchange
  charge: string
}

const FORMULAIRE_VIDE: Formulaire = {
  systeme: 'AUTRE',
  direction: 'SORTANT',
  type_echange: '',
  statut: 'SUCCES',
  charge: '',
}

export function Interop() {
  const queryClient = useQueryClient()
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCreation, setEnCreation] = useState(false)

  const { data: echanges, isLoading } = useQuery({
    queryKey: ['interop-echanges'],
    queryFn: () => requeteApi<Pagination<EchangeExterne>>('/backoffice/interop/echanges?limit=20'),
  })

  const { data: rapprochement } = useQuery({
    queryKey: ['interop-rapprochement'],
    queryFn: () => requeteApi<RapprochementPaiements>('/backoffice/interop/rapprochement-paiements'),
  })

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/interop/echanges', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['interop-echanges'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Enregistrement impossible.') : 'Enregistrement impossible.')
    } finally {
      setEnCreation(false)
    }
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          Interconnexion
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Journal des échanges externes et rapprochement des paiements — jamais exposé côté public.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <Carte>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                Journal des échanges externes
              </h2>
              <Bouton taille="sm" onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
                <Plus size={14} aria-hidden="true" />
                Enregistrer un échange
              </Bouton>
            </div>

            {afficherFormulaire && (
              <form onSubmit={creer} className="mt-4 flex flex-col gap-3 border-b border-border pb-4 dark:border-border-dark">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="systeme" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                      Système
                    </label>
                    <select
                      id="systeme"
                      value={champs.systeme}
                      onChange={(e) => setChamps((c) => ({ ...c, systeme: e.target.value as SystemeExterne }))}
                      className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                                 dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                    >
                      {(Object.entries(LIBELLES_SYSTEME_EXTERNE) as [SystemeExterne, string][]).map(([valeur, libelle]) => (
                        <option key={valeur} value={valeur}>
                          {libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="direction" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                      Direction
                    </label>
                    <select
                      id="direction"
                      value={champs.direction}
                      onChange={(e) => setChamps((c) => ({ ...c, direction: e.target.value as DirectionEchange }))}
                      className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                                 dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                    >
                      <option value="SORTANT">Sortant</option>
                      <option value="ENTRANT">Entrant</option>
                    </select>
                  </div>
                </div>
                <ChampTexte
                  etiquette="Type d'échange"
                  required
                  placeholder="ex. Transmission manuelle du registre d'écrou"
                  value={champs.type_echange}
                  onChange={(e) => setChamps((c) => ({ ...c, type_echange: e.target.value }))}
                />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="statut-echange" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                    Statut
                  </label>
                  <select
                    id="statut-echange"
                    value={champs.statut}
                    onChange={(e) => setChamps((c) => ({ ...c, statut: e.target.value as StatutEchange }))}
                    className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                               dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                  >
                    <option value="SUCCES">Succès</option>
                    <option value="ECHEC">Échec</option>
                  </select>
                </div>
                <ChampTexte
                  etiquette="Contenu de la charge échangée (facultatif — seule l'empreinte est conservée)"
                  value={champs.charge}
                  onChange={(e) => setChamps((c) => ({ ...c, charge: e.target.value }))}
                />
                {erreur && (
                  <p role="alert" className="font-corps text-sm text-error">
                    {erreur}
                  </p>
                )}
                <Bouton type="submit" taille="sm" disabled={enCreation} className="self-start">
                  Enregistrer
                </Bouton>
              </form>
            )}

            <motion.div className="mt-4 flex flex-col gap-3" variants={conteneurEnCascade()} initial="hidden" animate="visible">
              {(echanges?.results ?? []).map((echange) => (
                <motion.div
                  key={echange.id}
                  variants={elementEnCascade}
                  className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 dark:border-border-dark"
                >
                  <div className="min-w-0">
                    <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                      {LIBELLES_SYSTEME_EXTERNE[echange.systeme]} · {echange.type_echange}
                    </p>
                    <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      {echange.direction === 'SORTANT' ? 'Sortant' : 'Entrant'} · {echange.acteur_nom || 'système'} ·{' '}
                      {new Date(echange.cree_le).toLocaleString('fr-SN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge ton={TON_PAR_STATUT[echange.statut]} libelle={echange.statut === 'SUCCES' ? 'Succès' : 'Échec'} />
                </motion.div>
              ))}
              {!isLoading && echanges?.results.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun échange enregistré.</p>
              )}
            </motion.div>
          </Carte>
        </div>

        <div className="flex flex-col gap-6">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Rapprochement des paiements
            </h2>
            {rapprochement && (
              <>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-corps text-sm">
                  <dt className="text-text-muted dark:text-text-inv-muted">Payé</dt>
                  <dd className="text-text-body dark:text-text-inv-body">{rapprochement.total_paye} FCFA</dd>
                  <dt className="text-text-muted dark:text-text-inv-muted">En attente</dt>
                  <dd className="text-text-body dark:text-text-inv-body">{rapprochement.total_en_attente} FCFA</dd>
                  <dt className="text-text-muted dark:text-text-inv-muted">Échec</dt>
                  <dd className="text-text-body dark:text-text-inv-body">{rapprochement.total_echec} FCFA</dd>
                </dl>
                {rapprochement.paiements_en_attente_anormalement.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3 dark:border-border-dark">
                    <p className="flex items-center gap-1.5 font-corps text-xs font-semibold text-error">
                      <ShieldAlert size={14} aria-hidden="true" />
                      Anomalies (en attente &gt; 3 jours)
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {rapprochement.paiements_en_attente_anormalement.map((p) => (
                        <p key={p.reference} className="font-corps text-xs text-text-body dark:text-text-inv-body">
                          {p.reference} — {p.montant} FCFA ({p.moyen})
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Carte>
        </div>
      </div>
    </section>
  )
}
