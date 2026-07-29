import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, User } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { DossierAgentListe, Pagination, UtilisateurSansDossier } from '../types/api'

export function RhDossiers() {
  const queryClient = useQueryClient()
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [rechercheAgent, setRechercheAgent] = useState('')
  const [agentChoisi, setAgentChoisi] = useState<UtilisateurSansDossier | null>(null)
  const [corps, setCorps] = useState('')
  const [grade, setGrade] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rh-dossiers'],
    queryFn: () => requeteApi<Pagination<DossierAgentListe>>('/backoffice/rh/dossiers?limit=100'),
  })

  const { data: agentsSansDossier } = useQuery({
    queryKey: ['rh-utilisateurs-sans-dossier', rechercheAgent],
    queryFn: () =>
      requeteApi<UtilisateurSansDossier[]>(
        `/backoffice/rh/utilisateurs-sans-dossier${rechercheAgent ? `?q=${encodeURIComponent(rechercheAgent)}` : ''}`,
      ),
    enabled: afficherFormulaire && !agentChoisi,
  })

  async function creer(e: FormEvent) {
    e.preventDefault()
    if (!agentChoisi) {
      setErreur('Sélectionnez un agent.')
      return
    }
    setErreur(null)
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/rh/dossiers', {
        method: 'POST',
        body: JSON.stringify({ utilisateur: agentChoisi.id, corps, grade }),
      })
      await queryClient.invalidateQueries({ queryKey: ['rh-dossiers'] })
      setAgentChoisi(null)
      setRechercheAgent('')
      setCorps('')
      setGrade('')
      setAfficherFormulaire(false)
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Création impossible.') : 'Création impossible.')
    } finally {
      setEnCreation(false)
    }
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            Ressources humaines — Dossiers
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Référentiel du personnel — jamais exposé côté public.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Créer un dossier
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            {!agentChoisi ? (
              <div className="flex flex-col gap-1.5">
                <ChampTexte
                  etiquette="Rechercher un agent (nom ou e-mail)"
                  value={rechercheAgent}
                  onChange={(e) => setRechercheAgent(e.target.value)}
                />
                <div className="mt-2 flex flex-col divide-y divide-border rounded-bouton border border-border dark:divide-border-dark dark:border-border-dark">
                  {(agentsSansDossier ?? []).map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setAgentChoisi(agent)}
                      className="flex flex-col items-start gap-0.5 p-3 text-left hover:bg-surface-tint dark:hover:bg-white/5"
                    >
                      <span className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                        {agent.nom_complet}
                      </span>
                      <span className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                        {agent.email}
                      </span>
                    </button>
                  ))}
                  {(agentsSansDossier ?? []).length === 0 && (
                    <p className="p-3 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                      Aucun agent sans dossier trouvé.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-bouton border border-border p-3 dark:border-border-dark">
                <div>
                  <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {agentChoisi.nom_complet}
                  </p>
                  <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">{agentChoisi.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAgentChoisi(null)}
                  className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                >
                  Changer
                </button>
              </div>
            )}
            <ChampTexte etiquette="Corps" value={corps} onChange={(e) => setCorps(e.target.value)} />
            <ChampTexte etiquette="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
            {erreur && (
              <p role="alert" className="font-corps text-sm text-error">
                {erreur}
              </p>
            )}
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer le dossier'}
            </Bouton>
          </form>
        </Carte>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les dossiers.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((dossier) => (
          <motion.div key={dossier.id} variants={elementEnCascade}>
            <Link
              to={`/rh/dossiers/${dossier.id}`}
              className="flex items-center gap-3 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                <User size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                  {dossier.utilisateur_nom}
                </p>
                <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  {dossier.grade || dossier.corps || '—'}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun dossier.</p>
        )}
      </motion.div>
    </section>
  )
}
