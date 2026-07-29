import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Lock, Plus, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { DocumentGedListe, NatureDocumentGed, Pagination, StatutOcrGed } from '../types/api'
import { LIBELLES_NATURE_GED, LIBELLES_STATUT_OCR } from '../types/api'

const TON_PAR_STATUT_OCR: Record<StatutOcrGed, TonBadge> = {
  EN_ATTENTE: 'neutre',
  TRAITE: 'succes',
  ECHEC: 'attente',
}

const EXTENSIONS_ACCEPTEES = '.pdf,.jpg,.jpeg,.png'

export function GedListe() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [titre, setTitre] = useState('')
  const [nature, setNature] = useState<NatureDocumentGed>('ADMINISTRATIF')
  const [categorie, setCategorie] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ged-documents', recherche],
    queryFn: () =>
      requeteApi<Pagination<DocumentGedListe>>(
        `/backoffice/ged/documents${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`,
      ),
  })

  function selectionnerFichier(e: ChangeEvent<HTMLInputElement>) {
    setFichier(e.target.files?.[0] ?? null)
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    if (!fichier) {
      setErreurs({ fichier: 'Un fichier est requis.' })
      return
    }
    setErreurs({})
    setEnCreation(true)
    try {
      const donnees = new FormData()
      donnees.append('titre', titre)
      donnees.append('nature', nature)
      donnees.append('categorie', categorie)
      donnees.append('fichier', fichier)
      await requeteApiFichier('/backoffice/ged/documents', donnees)
      await queryClient.invalidateQueries({ queryKey: ['ged-documents'] })
      setTitre('')
      setCategorie('')
      setFichier(null)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Record<string, string> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          if (messages[0]) parChamp[champ] = messages[0]
        }
        setErreurs(parChamp)
      } else {
        setErreurs({ fichier: "Le document n'a pas pu être créé." })
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
            Gestion électronique de documents
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Référentiel documentaire avec OCR français automatique — jamais exposé côté public.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Déposer un document
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte etiquette="Titre" required value={titre} onChange={(e) => setTitre(e.target.value)} erreur={erreurs.titre} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nature" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Nature
              </label>
              <select
                id="nature"
                value={nature}
                onChange={(e) => setNature(e.target.value as NatureDocumentGed)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {(Object.entries(LIBELLES_NATURE_GED) as [NatureDocumentGed, string][]).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            <ChampTexte
              etiquette="Catégorie / plan de classement (facultatif)"
              placeholder="ex. rh/contrats"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              erreur={erreurs.categorie}
            />
            <div className="flex flex-col gap-1.5">
              <span className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">Fichier (PDF, JPG, PNG)</span>
              <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-bouton border border-border px-3.5 py-2 font-corps text-sm font-semibold text-text-strong hover:bg-surface-tint dark:border-border-dark dark:text-text-inv-strong dark:hover:bg-white/10">
                <Upload size={16} aria-hidden="true" />
                {fichier ? fichier.name : 'Choisir un fichier'}
                <input type="file" accept={EXTENSIONS_ACCEPTEES} className="sr-only" onChange={selectionnerFichier} />
              </label>
              {erreurs.fichier && (
                <p role="alert" className="font-corps text-sm text-error">
                  {erreurs.fichier}
                </p>
              )}
            </div>
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Dépôt en cours…' : 'Déposer'}
            </Bouton>
          </form>
        </Carte>
      )}

      <div className="mt-6 max-w-md">
        <ChampTexte
          etiquette="Rechercher par titre ou contenu (OCR)"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger le référentiel.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((document) => (
          <motion.div key={document.id} variants={elementEnCascade}>
            <Link
              to={`/ged/${document.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                  {document.est_verrouille ? <Lock size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {document.titre}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {LIBELLES_NATURE_GED[document.nature]}
                    {document.categorie && ` · ${document.categorie}`}
                    {document.verrouille_par_nom && ` · Verrouillé par ${document.verrouille_par_nom}`}
                  </p>
                </div>
              </div>
              <Badge ton={TON_PAR_STATUT_OCR[document.statut_ocr]} libelle={LIBELLES_STATUT_OCR[document.statut_ocr]} />
            </Link>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun document.</p>
        )}
      </motion.div>
    </section>
  )
}
