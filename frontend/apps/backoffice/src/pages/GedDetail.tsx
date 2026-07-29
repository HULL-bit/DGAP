import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, History, Lock, Share2, Unlock, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, type TonBadge } from '@dgap/ui'
import type { DocumentGedDetail, LienPartageGed, StatutOcrGed } from '../types/api'
import { LIBELLES_NATURE_GED, LIBELLES_STATUT_OCR } from '../types/api'

const TON_PAR_STATUT_OCR: Record<StatutOcrGed, TonBadge> = {
  EN_ATTENTE: 'neutre',
  TRAITE: 'succes',
  ECHEC: 'attente',
}

const EXTENSIONS_ACCEPTEES = '.pdf,.jpg,.jpeg,.png'

export function GedDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [commentaireVersion, setCommentaireVersion] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [lienCree, setLienCree] = useState<LienPartageGed | null>(null)

  const { data: document, isLoading } = useQuery({
    queryKey: ['ged-detail', id],
    queryFn: () => requeteApi<DocumentGedDetail>(`/backoffice/ged/documents/${id}`),
  })

  async function invalider() {
    setLienCree(null)
    await queryClient.invalidateQueries({ queryKey: ['ged-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['ged-documents'] })
  }

  async function deposerNouvelleVersion(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur(null)
    setEnCours(true)
    try {
      const donnees = new FormData()
      donnees.append('fichier', fichier)
      donnees.append('commentaire', commentaireVersion)
      await requeteApiFichier(`/backoffice/ged/documents/${id}/versions`, donnees)
      setCommentaireVersion('')
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Dépôt impossible.') : 'Dépôt impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function restaurer(numero: number) {
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/ged/documents/${id}/versions/${numero}/restaurer`, { method: 'POST' })
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Restauration impossible.') : 'Restauration impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function basculerVerrou() {
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/ged/documents/${id}/verrouillage`, {
        method: document?.est_verrouille ? 'DELETE' : 'POST',
      })
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function creerLienPartage(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      const lien = await requeteApi<LienPartageGed>(`/backoffice/ged/documents/${id}/partage`, {
        method: 'POST',
        body: JSON.stringify({ duree_heures: 72 }),
      })
      setLienCree(lien)
    } catch {
      setErreur("Le lien de partage n'a pas pu être créé.")
    } finally {
      setEnCours(false)
    }
  }

  if (isLoading || !document) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/ged"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Gestion électronique de documents
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">{document.titre}</h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            {LIBELLES_NATURE_GED[document.nature]}
            {document.categorie && ` · ${document.categorie}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {document.est_verrouille && <Badge ton="attente" libelle={`Verrouillé par ${document.verrouille_par_nom}`} />}
          <Badge ton={TON_PAR_STATUT_OCR[document.statut_ocr]} libelle={LIBELLES_STATUT_OCR[document.statut_ocr]} />
        </div>
      </motion.div>

      {erreur && (
        <p role="alert" className="mt-4 font-corps text-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Contenu océrisé
            </h2>
            <p className="mt-3 whitespace-pre-wrap font-corps text-sm text-text-body dark:text-text-inv-body">
              {document.contenu_ocr || 'Aucun texte reconnu.'}
            </p>
            <p className="mt-4 font-corps text-xs text-text-muted dark:text-text-inv-muted">
              Empreinte SHA-256 : <span className="font-mono">{document.empreinte_sha256}</span>
            </p>
          </Carte>

          <Carte>
            <h2 className="flex items-center gap-1.5 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              <History size={14} aria-hidden="true" />
              Historique des versions
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {document.versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 dark:border-border-dark">
                  <div className="min-w-0">
                    <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                      Version {version.numero}
                      {version.commentaire && ` — ${version.commentaire}`}
                    </p>
                    <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      par {version.auteur_nom || 'système'} le{' '}
                      {new Date(version.cree_le).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={version.fichier_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                    >
                      Voir
                    </a>
                    <button
                      type="button"
                      onClick={() => restaurer(version.numero)}
                      disabled={enCours}
                      className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                    >
                      Restaurer
                    </button>
                  </div>
                </div>
              ))}
              {document.versions.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune version antérieure.</p>
              )}
            </div>
          </Carte>
        </div>

        <div className="flex flex-col gap-6">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Fichier courant
            </h2>
            <a
              href={document.fichier_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              <FileText size={16} aria-hidden="true" />
              Voir le fichier
            </a>
            <div className="mt-4">
              <ChampTexte
                etiquette="Commentaire de version (facultatif)"
                value={commentaireVersion}
                onChange={(e) => setCommentaireVersion(e.target.value)}
              />
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-bouton bg-primary px-3.5 py-2 font-corps text-sm font-semibold text-white transition-colors duration-200 ease-dgap hover:bg-primary-dark">
              <Upload size={16} aria-hidden="true" />
              Déposer une nouvelle version
              <input type="file" accept={EXTENSIONS_ACCEPTEES} className="sr-only" onChange={deposerNouvelleVersion} disabled={enCours} />
            </label>
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Verrouillage
            </h2>
            <p className="mt-3 font-corps text-sm text-text-body dark:text-text-inv-body">
              {document.est_verrouille
                ? `Verrouillé par ${document.verrouille_par_nom || 'un autre agent'}.`
                : "Aucun verrou — modification possible par n'importe quel agent habilité."}
            </p>
            <Bouton onClick={basculerVerrou} disabled={enCours} taille="sm" className="mt-3 gap-1.5">
              {document.est_verrouille ? <Unlock size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
              {document.est_verrouille ? 'Déverrouiller' : 'Verrouiller'}
            </Bouton>
          </Carte>

          <Carte>
            <h2 className="flex items-center gap-1.5 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              <Share2 size={14} aria-hidden="true" />
              Partage interne
            </h2>
            <form onSubmit={creerLienPartage} className="mt-3">
              <Bouton type="submit" disabled={enCours} taille="sm">
                Générer un lien (72h)
              </Bouton>
            </form>
            {lienCree && (
              <p className="mt-3 break-all font-corps text-xs text-text-muted dark:text-text-inv-muted">
                Jeton : <span className="font-mono">{lienCree.jeton}</span>
                <br />
                Expire le{' '}
                {new Date(lienCree.expire_le).toLocaleString('fr-SN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </Carte>
        </div>
      </div>
    </section>
  )
}
