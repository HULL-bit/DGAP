import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { DocumentOfficiel, NatureDocument, Pagination } from '../types/api'
import { LIBELLES_NATURE_DOCUMENT } from '../types/api'

const FILTRES: { valeur: NatureDocument | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'LOI', libelle: 'Lois' },
  { valeur: 'DECRET', libelle: 'Décrets' },
  { valeur: 'ARRETE', libelle: 'Arrêtés' },
  { valeur: 'AVIS_CONCOURS', libelle: 'Avis de concours' },
  { valeur: 'COMMUNIQUE', libelle: 'Communiqués' },
  { valeur: 'RAPPORT', libelle: 'Rapports' },
]

interface FormulaireDocument {
  titre: string
  nature: NatureDocument
  numero: string
  date_texte: string
  categorie: string
}

const FORMULAIRE_VIDE: FormulaireDocument = {
  titre: '',
  nature: 'COMMUNIQUE',
  numero: '',
  date_texte: '',
  categorie: '',
}

export function DocumentsListe() {
  const queryClient = useQueryClient()
  const [filtre, setFiltre] = useState<NatureDocument | ''>('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<FormulaireDocument>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireDocument, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backoffice-documents'],
    queryFn: () => requeteApi<Pagination<DocumentOfficiel>>('/backoffice/documents?limit=100'),
  })

  const documents = (data?.results ?? []).filter((d) => !filtre || d.nature === filtre)

  function majChamp(champ: keyof FormulaireDocument, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/documents', {
        method: 'POST',
        body: JSON.stringify({ ...champs, date_texte: champs.date_texte || null }),
      })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-documents'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireDocument, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireDocument] = messages[0]
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
            Documents officiels
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Textes juridiques, avis de concours, statistiques — publications téléchargeables par les citoyens.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Nouveau document
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
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nature" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Nature
              </label>
              <select
                id="nature"
                value={champs.nature}
                onChange={(e) => majChamp('nature', e.target.value as NatureDocument)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {(Object.entries(LIBELLES_NATURE_DOCUMENT) as [NatureDocument, string][]).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            <ChampTexte
              etiquette="Numéro (facultatif)"
              value={champs.numero}
              onChange={(e) => majChamp('numero', e.target.value)}
              erreur={erreurs.numero}
            />
            <ChampTexte
              etiquette="Date du texte (facultative)"
              type="date"
              value={champs.date_texte}
              onChange={(e) => majChamp('date_texte', e.target.value)}
              erreur={erreurs.date_texte}
            />
            <ChampTexte
              etiquette="Catégorie (regroupement portail, ex. textes-juridiques, concours, statistiques)"
              value={champs.categorie}
              onChange={(e) => majChamp('categorie', e.target.value)}
              erreur={erreurs.categorie}
            />
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer le document'}
            </Bouton>
          </form>
        </Carte>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.valeur || 'tous'}
            type="button"
            onClick={() => setFiltre(f.valeur)}
            className={`rounded-full px-3.5 py-2 font-corps text-sm font-semibold transition-colors duration-200 ease-dgap
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                       ${
                         filtre === f.valeur
                           ? 'bg-primary text-white'
                           : 'bg-surface-tint text-text-strong hover:bg-surface-muted dark:bg-white/5 dark:text-text-inv-body'
                       }`}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les documents.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {documents.map((document) => {
          const ton: TonBadge = !document.publie ? 'neutre' : document.fichier_url ? 'succes' : 'attente'
          const libelleEtat = !document.publie ? 'Non publié' : document.fichier_url ? 'Publié' : 'Sans fichier'
          return (
            <motion.div key={document.id} variants={elementEnCascade}>
              <Link
                to={`/documents/${document.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                    <FileText size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                      {document.titre}
                    </p>
                    <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      {LIBELLES_NATURE_DOCUMENT[document.nature]}
                      {document.categorie && ` · ${document.categorie}`}
                    </p>
                  </div>
                </div>
                <Badge ton={ton} libelle={libelleEtat} />
              </Link>
            </motion.div>
          )
        })}
        {!isLoading && documents.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun document.</p>
        )}
      </motion.div>
    </section>
  )
}
