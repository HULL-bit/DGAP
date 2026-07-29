import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ImageIcon, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { Galerie, Pagination } from '../types/api'

interface FormulaireGalerie {
  code: string
  titre: string
  description: string
}

const FORMULAIRE_VIDE: FormulaireGalerie = { code: '', titre: '', description: '' }

export function GaleriesListe() {
  const queryClient = useQueryClient()
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<FormulaireGalerie>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireGalerie, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['backoffice-galeries'],
    queryFn: () => requeteApi<Pagination<Galerie>>('/backoffice/galeries'),
  })
  const galeries = data?.results ?? []

  function majChamp(champ: keyof FormulaireGalerie, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/galeries', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-galeries'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireGalerie, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireGalerie] = messages[0]
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
            Galeries
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Collections d'images et de vidéos — carrousel d'accueil, réinsertion, vie des détenus,
            articles.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Nouvelle galerie
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Code (identifiant technique, ex. accueil-carrousel)"
              required
              value={champs.code}
              onChange={(e) => majChamp('code', e.target.value)}
              erreur={erreurs.code}
            />
            <ChampTexte
              etiquette="Titre"
              required
              value={champs.titre}
              onChange={(e) => majChamp('titre', e.target.value)}
              erreur={erreurs.titre}
            />
            <ChampTexte
              etiquette="Description (facultative)"
              value={champs.description}
              onChange={(e) => majChamp('description', e.target.value)}
              erreur={erreurs.description}
            />
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer la galerie'}
            </Bouton>
          </form>
        </Carte>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}

      <motion.div
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {galeries?.map((galerie) => (
          <motion.div key={galerie.id} variants={elementEnCascade}>
            <Link to={`/galeries/${galerie.id}`}>
              <Carte interactive className="h-full">
                <div className="flex items-center gap-2 text-primary dark:text-accent-soft">
                  <ImageIcon size={18} aria-hidden="true" />
                  <span className="font-corps text-xs font-medium uppercase tracking-wide">
                    {galerie.code}
                  </span>
                </div>
                <p className="mt-2 font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                  {galerie.titre}
                </p>
                <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                  {galerie.medias.length} média{galerie.medias.length > 1 ? 's' : ''}
                </p>
              </Carte>
            </Link>
          </motion.div>
        ))}
        {!isLoading && galeries?.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Aucune galerie pour le moment.
          </p>
        )}
      </motion.div>
    </section>
  )
}
