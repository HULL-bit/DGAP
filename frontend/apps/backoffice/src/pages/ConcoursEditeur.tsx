import { useEffect, useState, type ChangeEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition } from '@dgap/ui'
import type { Concours, StatutConcours } from '../types/api'

const OPTIONS_STATUT: { valeur: StatutConcours; libelle: string }[] = [
  { valeur: 'BROUILLON', libelle: 'Brouillon' },
  { valeur: 'OUVERT', libelle: 'Ouvert' },
  { valeur: 'CLOTURE', libelle: 'Clôturé' },
  { valeur: 'RESULTATS_PUBLIES', libelle: 'Résultats publiés' },
]

interface Formulaire {
  titre: string
  code: string
  description: string
  conditions: string
  frais_inscription: string
  date_ouverture: string
  date_cloture: string
  date_concours: string
  places_disponibles: string
  statut: StatutConcours
}

const FORMULAIRE_VIDE: Formulaire = {
  titre: '',
  code: '',
  description: '',
  conditions: '',
  frais_inscription: '0',
  date_ouverture: '',
  date_cloture: '',
  date_concours: '',
  places_disponibles: '',
  statut: 'BROUILLON',
}

export function ConcoursEditeur() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [enTeleversementAvis, setEnTeleversementAvis] = useState(false)
  const [erreurAvis, setErreurAvis] = useState<string | null>(null)

  const { data: concours, isLoading } = useQuery({
    queryKey: ['backoffice-concours-detail', id],
    queryFn: () => requeteApi<Concours>(`/backoffice/concours/${id}`),
  })

  useEffect(() => {
    if (concours) {
      setChamps({
        titre: concours.titre,
        code: concours.code,
        description: concours.description,
        conditions: concours.conditions,
        frais_inscription: concours.frais_inscription,
        date_ouverture: concours.date_ouverture,
        date_cloture: concours.date_cloture,
        date_concours: concours.date_concours ?? '',
        places_disponibles: concours.places_disponibles?.toString() ?? '',
        statut: concours.statut,
      })
    }
  }, [concours])

  function majChamp<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function enregistrer() {
    setEnregistrement(true)
    setErreurs({})
    setMessage(null)
    try {
      const charge = {
        ...champs,
        date_concours: champs.date_concours || null,
        places_disponibles: champs.places_disponibles ? Number(champs.places_disponibles) : null,
      }
      await requeteApi(`/backoffice/concours/${id}`, { method: 'PATCH', body: JSON.stringify(charge) })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-concours-detail', id] })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-concours'] })
      setMessage('Modifications enregistrées.')
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof Formulaire, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof Formulaire] = messages[0]
        }
        setErreurs(parChamp)
      }
    } finally {
      setEnregistrement(false)
    }
  }

  async function televerserAvis(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    if (!fichier.name.toLowerCase().endsWith('.pdf')) {
      setErreurAvis('Seul le format PDF est accepté.')
      return
    }
    setErreurAvis(null)
    setEnTeleversementAvis(true)
    try {
      const donnees = new FormData()
      donnees.append('fichier', fichier)
      await requeteApiFichier(`/backoffice/concours/${id}/avis`, donnees)
      await queryClient.invalidateQueries({ queryKey: ['backoffice-concours-detail', id] })
    } catch (err) {
      setErreurAvis(err instanceof ApiError ? (err.probleme.detail ?? "L'avis n'a pas pu être téléversé.") : "L'avis n'a pas pu être téléversé.")
    } finally {
      setEnTeleversementAvis(false)
    }
  }

  if (isLoading || !concours) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/concours"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Concours
      </Link>

      <motion.h1
        className="mt-4 font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong"
        {...propsApparition()}
      >
        {concours.titre}
      </motion.h1>

      <div className="mt-8 flex max-w-2xl flex-col gap-5">
        <ChampTexte
          etiquette="Titre"
          required
          value={champs.titre}
          onChange={(e) => majChamp('titre', e.target.value)}
          erreur={erreurs.titre}
        />
        <ChampTexte
          etiquette="Description"
          value={champs.description}
          onChange={(e) => majChamp('description', e.target.value)}
        />
        <ChampTexte
          etiquette="Conditions d'accès"
          value={champs.conditions}
          onChange={(e) => majChamp('conditions', e.target.value)}
        />
        <ChampTexte
          etiquette="Frais d'inscription (FCFA)"
          type="number"
          min="0"
          value={champs.frais_inscription}
          onChange={(e) => majChamp('frais_inscription', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ChampTexte
            etiquette="Date d'ouverture"
            type="date"
            required
            value={champs.date_ouverture}
            onChange={(e) => majChamp('date_ouverture', e.target.value)}
          />
          <ChampTexte
            etiquette="Date de clôture"
            type="date"
            required
            value={champs.date_cloture}
            onChange={(e) => majChamp('date_cloture', e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ChampTexte
            etiquette="Date du concours (facultative)"
            type="date"
            value={champs.date_concours}
            onChange={(e) => majChamp('date_concours', e.target.value)}
          />
          <ChampTexte
            etiquette="Places disponibles (facultatif)"
            type="number"
            min="0"
            value={champs.places_disponibles}
            onChange={(e) => majChamp('places_disponibles', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="statut" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
            Statut
          </label>
          <select
            id="statut"
            value={champs.statut}
            onChange={(e) => majChamp('statut', e.target.value as StatutConcours)}
            className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                       dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
          >
            {OPTIONS_STATUT.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>
        </div>

        <Carte>
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
            Avis officiel (PDF)
          </h2>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Publié dans les documents officiels et sur l'accueil du portail dès le téléversement.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {concours.document_avis_url && (
              <a
                href={concours.document_avis_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                <FileText size={16} aria-hidden="true" />
                Voir l'avis actuel
              </a>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-bouton bg-primary px-3.5 py-2 font-corps text-sm font-semibold text-white transition-colors duration-200 ease-dgap hover:bg-primary-dark">
              <Upload size={16} aria-hidden="true" />
              {enTeleversementAvis ? 'Téléversement…' : concours.document_avis_url ? "Remplacer l'avis" : "Téléverser l'avis"}
              <input type="file" accept=".pdf" className="sr-only" disabled={enTeleversementAvis} onChange={televerserAvis} />
            </label>
          </div>
          {erreurAvis && (
            <p role="alert" className="mt-2 font-corps text-sm text-error">
              {erreurAvis}
            </p>
          )}
        </Carte>

        {message && <p className="font-corps text-sm text-text-body dark:text-text-inv-body">{message}</p>}

        <Bouton onClick={enregistrer} disabled={enregistrement} className="self-start">
          {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
        </Bouton>
      </div>
    </section>
  )
}
