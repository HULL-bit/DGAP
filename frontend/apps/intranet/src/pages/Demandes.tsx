import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, Plus } from 'lucide-react'
import { requeteApi, obtenirJetonAcces, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import { useAuth } from '../auth/AuthContext'
import type { DemandeRH, Pagination, StatutDemandeRH, TypeDemandeRH } from '../types/api'
import { LIBELLES_STATUT_DEMANDE_RH, LIBELLES_TYPE_DEMANDE_RH } from '../types/api'

const TON_PAR_STATUT: Record<StatutDemandeRH, TonBadge> = {
  SOUMISE: 'attente',
  VALIDEE: 'succes',
  REJETEE: 'erreur',
  ANNULEE: 'neutre',
}

function urlBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
}

interface Formulaire {
  type_demande: TypeDemandeRH
  date_debut: string
  date_fin: string
  motif: string
}

const FORMULAIRE_VIDE: Formulaire = { type_demande: 'CONGE', date_debut: '', date_fin: '', motif: '' }

export function Demandes() {
  const { possedeScope } = useAuth()
  const queryClient = useQueryClient()
  const peutValider = possedeScope('rh:valider') || possedeScope('rh:gerer')

  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enCreation, setEnCreation] = useState(false)
  const [rejetEnCours, setRejetEnCours] = useState<string | null>(null)
  const [motifRejet, setMotifRejet] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rh-demandes'],
    queryFn: () => requeteApi<Pagination<DemandeRH>>('/rh/demandes?limit=100'),
  })

  function majChamp<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/rh/demandes', {
        method: 'POST',
        body: JSON.stringify({
          type_demande: champs.type_demande,
          date_debut: champs.date_debut || null,
          date_fin: champs.date_fin || null,
          motif: champs.motif,
        }),
      })
      await queryClient.invalidateQueries({ queryKey: ['rh-demandes'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof Formulaire, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          if (messages[0]) parChamp[champ as keyof Formulaire] = messages[0]
        }
        setErreurs(parChamp)
      }
    } finally {
      setEnCreation(false)
    }
  }

  async function transitionner(id: string, action: 'valider' | 'rejeter' | 'annuler', motif_rejet = '') {
    await requeteApi(`/rh/demandes/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action, motif_rejet }),
    })
    setRejetEnCours(null)
    setMotifRejet('')
    await queryClient.invalidateQueries({ queryKey: ['rh-demandes'] })
  }

  async function telechargerAttestation(id: string, numero: string) {
    const jeton = obtenirJetonAcces()
    const reponse = await fetch(`${urlBase()}/rh/demandes/${id}/attestation`, {
      headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
    })
    if (!reponse.ok) return
    const blob = await reponse.blob()
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = `${numero}.pdf`
    lien.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            Mes demandes
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Congés, permissions d'absence et attestations de travail.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Nouvelle demande
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="type_demande" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Type de demande
              </label>
              <select
                id="type_demande"
                value={champs.type_demande}
                onChange={(e) => majChamp('type_demande', e.target.value as TypeDemandeRH)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {(Object.entries(LIBELLES_TYPE_DEMANDE_RH) as [TypeDemandeRH, string][]).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            {(champs.type_demande === 'CONGE' || champs.type_demande === 'PERMISSION_ABSENCE') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <ChampTexte
                  etiquette="Date de début"
                  type="date"
                  value={champs.date_debut}
                  onChange={(e) => majChamp('date_debut', e.target.value)}
                  erreur={erreurs.date_debut}
                />
                <ChampTexte
                  etiquette="Date de fin"
                  type="date"
                  value={champs.date_fin}
                  onChange={(e) => majChamp('date_fin', e.target.value)}
                  erreur={erreurs.date_fin}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="motif" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Motif
              </label>
              <textarea
                id="motif"
                rows={3}
                value={champs.motif}
                onChange={(e) => majChamp('motif', e.target.value)}
                className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              />
            </div>
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Envoi…' : 'Soumettre'}
            </Bouton>
          </form>
        </Carte>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les demandes.</p>}

      <motion.div
        className="mt-6 flex flex-col gap-3"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((demande) => (
          <motion.div key={demande.id} variants={elementEnCascade}>
            <Carte>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {demande.numero} — {LIBELLES_TYPE_DEMANDE_RH[demande.type_demande]}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {peutValider && `${demande.dossier_nom} · `}
                    {demande.date_debut &&
                      `${new Date(demande.date_debut).toLocaleDateString('fr-SN')} → ${demande.date_fin ? new Date(demande.date_fin).toLocaleDateString('fr-SN') : ''}`}
                    {demande.nombre_jours && ` (${demande.nombre_jours} j.)`}
                  </p>
                  {demande.motif && (
                    <p className="mt-2 font-corps text-sm text-text-body dark:text-text-inv-body">{demande.motif}</p>
                  )}
                  {demande.statut === 'REJETEE' && demande.motif_rejet && (
                    <p className="mt-2 font-corps text-xs text-error">Motif du rejet : {demande.motif_rejet}</p>
                  )}
                </div>
                <Badge ton={TON_PAR_STATUT[demande.statut]} libelle={LIBELLES_STATUT_DEMANDE_RH[demande.statut]} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {demande.statut === 'SOUMISE' && (
                  <button
                    type="button"
                    onClick={() => transitionner(demande.id, 'annuler')}
                    className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                  >
                    Annuler
                  </button>
                )}
                {demande.statut === 'SOUMISE' && peutValider && (
                  <>
                    <button
                      type="button"
                      onClick={() => transitionner(demande.id, 'valider')}
                      className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejetEnCours(rejetEnCours === demande.id ? null : demande.id)}
                      className="font-corps text-xs font-semibold text-error hover:underline"
                    >
                      Rejeter
                    </button>
                  </>
                )}
                {demande.statut === 'VALIDEE' && demande.type_demande === 'ATTESTATION_TRAVAIL' && (
                  <button
                    type="button"
                    onClick={() => telechargerAttestation(demande.id, demande.numero)}
                    className="inline-flex items-center gap-1.5 font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                  >
                    <Download size={14} aria-hidden="true" />
                    Télécharger l'attestation
                  </button>
                )}
              </div>

              {rejetEnCours === demande.id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 dark:border-border-dark">
                  <ChampTexte
                    etiquette="Motif du rejet"
                    value={motifRejet}
                    onChange={(e) => setMotifRejet(e.target.value)}
                  />
                  <Bouton
                    taille="sm"
                    className="self-start"
                    onClick={() => transitionner(demande.id, 'rejeter', motifRejet)}
                  >
                    Confirmer le rejet
                  </Bouton>
                </div>
              )}
            </Carte>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune demande.</p>
        )}
      </motion.div>
    </section>
  )
}
