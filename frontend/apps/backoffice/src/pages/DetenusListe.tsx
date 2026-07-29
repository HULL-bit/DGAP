import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lock, Plus, User } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { Pagination, PersonneDetenueListe, SexeDetenu, SituationPenale, StatutDossierDetenu } from '../types/api'
import { LIBELLES_SITUATION_PENALE, LIBELLES_STATUT_DOSSIER } from '../types/api'

const TON_PAR_STATUT: Record<StatutDossierDetenu, TonBadge> = {
  ECROUE: 'neutre',
  LIBERE: 'succes',
  TRANSFERE: 'attente',
  EVADE: 'erreur',
}

interface EtablissementOption {
  id: string
  nom: string
}

interface Formulaire {
  nom: string
  prenom: string
  date_naissance: string
  sexe: SexeDetenu
  situation_penale: SituationPenale
  etablissement: string
  date_ecrou: string
}

const FORMULAIRE_VIDE: Formulaire = {
  nom: '',
  prenom: '',
  date_naissance: '',
  sexe: 'M',
  situation_penale: 'PREVENU',
  etablissement: '',
  date_ecrou: new Date().toISOString().slice(0, 10),
}

export function DetenusListe() {
  const queryClient = useQueryClient()
  const [numeroEcrou, setNumeroEcrou] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['detenus-personnes', numeroEcrou],
    queryFn: () =>
      requeteApi<Pagination<PersonneDetenueListe>>(
        `/backoffice/detenus/personnes${numeroEcrou ? `?numero_ecrou=${encodeURIComponent(numeroEcrou)}` : ''}`,
      ),
  })

  const { data: etablissements } = useQuery({
    queryKey: ['etablissements-options'],
    queryFn: () => requeteApi<Pagination<EtablissementOption>>('/etablissements?limit=200'),
  })

  const listeEtablissements = etablissements?.results ?? []

  function majChamp<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/detenus/personnes', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['detenus-personnes'] })
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

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="flex items-center gap-2 font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            <Lock size={20} aria-hidden="true" />
            Dossier détenu
          </h1>
          <p className="mt-1 font-corps text-sm text-error">
            Accès réservé — données les plus sensibles du système. Toute consultation est journalisée.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Enregistrer un écrou
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte etiquette="Nom" required value={champs.nom} onChange={(e) => majChamp('nom', e.target.value)} erreur={erreurs.nom} />
              <ChampTexte etiquette="Prénom" required value={champs.prenom} onChange={(e) => majChamp('prenom', e.target.value)} erreur={erreurs.prenom} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte etiquette="Date de naissance" type="date" required value={champs.date_naissance} onChange={(e) => majChamp('date_naissance', e.target.value)} erreur={erreurs.date_naissance} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sexe" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  Sexe
                </label>
                <select
                  id="sexe"
                  value={champs.sexe}
                  onChange={(e) => majChamp('sexe', e.target.value as SexeDetenu)}
                  className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="situation" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Situation pénale
              </label>
              <select
                id="situation"
                value={champs.situation_penale}
                onChange={(e) => majChamp('situation_penale', e.target.value as SituationPenale)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {(Object.entries(LIBELLES_SITUATION_PENALE) as [SituationPenale, string][]).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="etablissement" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Établissement
              </label>
              <select
                id="etablissement"
                required
                value={champs.etablissement}
                onChange={(e) => majChamp('etablissement', e.target.value)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                <option value="">Sélectionner…</option>
                {listeEtablissements.map((etab) => (
                  <option key={etab.id} value={etab.id}>
                    {etab.nom}
                  </option>
                ))}
              </select>
            </div>
            <ChampTexte etiquette="Date d'écrou" type="date" required value={champs.date_ecrou} onChange={(e) => majChamp('date_ecrou', e.target.value)} erreur={erreurs.date_ecrou} />
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Enregistrement…' : "Enregistrer l'écrou"}
            </Bouton>
          </form>
        </Carte>
      )}

      <div className="mt-6 max-w-md">
        <ChampTexte etiquette="Rechercher par numéro d'écrou" value={numeroEcrou} onChange={(e) => setNumeroEcrou(e.target.value)} />
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger le dossier détenu.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((personne) => (
          <motion.div key={personne.id} variants={elementEnCascade}>
            <Link
              to={`/detenus/${personne.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                  <User size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {personne.numero_ecrou}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {personne.etablissement_libelle} · {LIBELLES_SITUATION_PENALE[personne.situation_penale]}
                  </p>
                </div>
              </div>
              <Badge ton={TON_PAR_STATUT[personne.statut_dossier]} libelle={LIBELLES_STATUT_DOSSIER[personne.statut_dossier]} />
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
