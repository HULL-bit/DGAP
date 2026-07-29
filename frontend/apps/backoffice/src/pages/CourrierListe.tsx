import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lock, Mail, Plus, ShieldAlert } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { CourrierEntrantListe, NiveauConfidentialite, Pagination, StatutCourrierEntrant } from '../types/api'
import { LIBELLES_CONFIDENTIALITE, LIBELLES_STATUT_COURRIER } from '../types/api'

const TON_PAR_STATUT: Record<StatutCourrierEntrant, TonBadge> = {
  ENREGISTRE: 'neutre',
  AFFECTE: 'attente',
  EN_TRAITEMENT: 'attente',
  TRAITE: 'succes',
  CLOS: 'neutre',
}

interface FormulaireCourrier {
  expediteur: string
  objet: string
  date_reception: string
  confidentialite: NiveauConfidentialite
}

const FORMULAIRE_VIDE: FormulaireCourrier = {
  expediteur: '',
  objet: '',
  date_reception: new Date().toISOString().slice(0, 10),
  confidentialite: 'NORMAL',
}

export function CourrierListe() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<FormulaireCourrier>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireCourrier, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['courrier-entrant', recherche],
    queryFn: () =>
      requeteApi<Pagination<CourrierEntrantListe>>(
        `/backoffice/courrier/entrant${recherche ? `?objet=${encodeURIComponent(recherche)}` : ''}`,
      ),
  })

  function majChamp<K extends keyof FormulaireCourrier>(champ: K, valeur: FormulaireCourrier[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/courrier/entrant', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['courrier-entrant'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireCourrier, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireCourrier] = messages[0]
        }
        setErreurs(parChamp)
      }
    } finally {
      setEnCreation(false)
    }
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            Courrier entrant
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Registre, affectation et suivi du courrier — jamais exposé côté public.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Enregistrer un courrier
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Expéditeur"
              required
              value={champs.expediteur}
              onChange={(e) => majChamp('expediteur', e.target.value)}
              erreur={erreurs.expediteur}
            />
            <ChampTexte
              etiquette="Objet"
              required
              value={champs.objet}
              onChange={(e) => majChamp('objet', e.target.value)}
              erreur={erreurs.objet}
            />
            <ChampTexte
              etiquette="Date de réception"
              type="date"
              required
              value={champs.date_reception}
              onChange={(e) => majChamp('date_reception', e.target.value)}
              erreur={erreurs.date_reception}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confidentialite" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Confidentialité
              </label>
              <select
                id="confidentialite"
                value={champs.confidentialite}
                onChange={(e) => majChamp('confidentialite', e.target.value as NiveauConfidentialite)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {(Object.entries(LIBELLES_CONFIDENTIALITE) as [NiveauConfidentialite, string][]).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Enregistrement…' : 'Enregistrer'}
            </Bouton>
          </form>
        </Carte>
      )}

      <div className="mt-6 max-w-md">
        <ChampTexte
          etiquette="Rechercher par objet"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger le registre.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((courrier) => (
          <motion.div key={courrier.id} variants={elementEnCascade}>
            <Link
              to={`/courrier/${courrier.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                  {courrier.confidentialite === 'NORMAL' ? (
                    <Mail size={18} aria-hidden="true" />
                  ) : (
                    <Lock size={18} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {courrier.numero} — {courrier.objet}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {courrier.expediteur}
                    {courrier.agent_affecte_nom && ` · Affecté à ${courrier.agent_affecte_nom}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {courrier.est_en_retard && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1 font-corps text-xs font-semibold text-error">
                    <ShieldAlert size={12} aria-hidden="true" />
                    En retard
                  </span>
                )}
                <Badge ton={TON_PAR_STATUT[courrier.statut]} libelle={LIBELLES_STATUT_COURRIER[courrier.statut]} />
              </div>
            </Link>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun courrier.</p>
        )}
      </motion.div>
    </section>
  )
}
