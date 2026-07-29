import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GraduationCap, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { Concours, Pagination, StatutConcours } from '../types/api'

const TON_PAR_STATUT: Record<StatutConcours, TonBadge> = {
  BROUILLON: 'neutre',
  OUVERT: 'succes',
  CLOTURE: 'alerte',
  RESULTATS_PUBLIES: 'attente',
}

const LIBELLES_STATUT: Record<StatutConcours, string> = {
  BROUILLON: 'Brouillon',
  OUVERT: 'Ouvert',
  CLOTURE: 'Clôturé',
  RESULTATS_PUBLIES: 'Résultats publiés',
}

interface FormulaireConcours {
  titre: string
  code: string
  description: string
  conditions: string
  frais_inscription: string
  date_ouverture: string
  date_cloture: string
}

const FORMULAIRE_VIDE: FormulaireConcours = {
  titre: '',
  code: '',
  description: '',
  conditions: '',
  frais_inscription: '0',
  date_ouverture: '',
  date_cloture: '',
}

export function ConcoursListe() {
  const queryClient = useQueryClient()
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<FormulaireConcours>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireConcours, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['backoffice-concours'],
    queryFn: () => requeteApi<Pagination<Concours>>('/backoffice/concours'),
  })
  const concoursListe = data?.results ?? []

  function majChamp(champ: keyof FormulaireConcours, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/concours', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-concours'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireConcours, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireConcours] = messages[0]
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
            Concours
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Avis de concours — dates, conditions, frais d'inscription.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Nouveau concours
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Titre"
              required
              value={champs.titre}
              onChange={(e) => majChamp('titre', e.target.value)}
              erreur={erreurs.titre}
            />
            <ChampTexte
              etiquette="Code (identifiant technique)"
              required
              value={champs.code}
              onChange={(e) => majChamp('code', e.target.value)}
              erreur={erreurs.code}
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
              erreur={erreurs.frais_inscription}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte
                etiquette="Date d'ouverture"
                type="date"
                required
                value={champs.date_ouverture}
                onChange={(e) => majChamp('date_ouverture', e.target.value)}
                erreur={erreurs.date_ouverture}
              />
              <ChampTexte
                etiquette="Date de clôture"
                type="date"
                required
                value={champs.date_cloture}
                onChange={(e) => majChamp('date_cloture', e.target.value)}
                erreur={erreurs.date_cloture}
              />
            </div>
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer le concours'}
            </Bouton>
          </form>
        </Carte>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {concoursListe.map((c) => (
          <motion.div key={c.id} variants={elementEnCascade}>
            <Link
              to={`/concours/${c.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <GraduationCap size={18} className="shrink-0 text-primary dark:text-accent-soft" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {c.titre}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    Clôture le{' '}
                    {new Date(c.date_cloture).toLocaleDateString('fr-SN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <Badge ton={TON_PAR_STATUT[c.statut]} libelle={LIBELLES_STATUT[c.statut]} />
            </Link>
          </motion.div>
        ))}
        {!isLoading && concoursListe.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun concours.</p>
        )}
      </motion.div>
    </section>
  )
}
