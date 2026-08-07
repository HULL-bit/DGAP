import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, History, RotateCcw, Trash2, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, type TonBadge } from '@dgap/ui'
import { useAuth } from '../auth/AuthContext'
import type { ArticleBackoffice, Galerie, Pagination, StatutContenu, VersionContenu } from '../types/api'
import { ACTIONS_PAR_STATUT, LIBELLES_STATUT } from '../types/api'

const TON_PAR_STATUT: Record<StatutContenu, TonBadge> = {
  BROUILLON: 'neutre',
  RELECTURE: 'attente',
  VALIDE: 'attente',
  PUBLIE: 'succes',
  ARCHIVE: 'alerte',
}

const SCOPE_PAR_ACTION: Record<string, string> = {
  soumettre: 'contenus:rediger',
  valider: 'contenus:valider',
  rejeter: 'contenus:valider',
  publier: 'contenus:publier',
  archiver: 'contenus:publier',
  reactiver: 'contenus:rediger',
}

interface Formulaire {
  titre: string
  slug: string
  chapo: string
  contenu: string
  meta_titre: string
  meta_description: string
}

const FORMULAIRE_VIDE: Formulaire = { titre: '', slug: '', chapo: '', contenu: '', meta_titre: '', meta_description: '' }

export function ArticleEditeur() {
  const { id } = useParams<{ id: string }>()
  const estNouveau = id === 'nouveau'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { possedeScope } = useAuth()

  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageAction, setMessageAction] = useState<string | null>(null)
  const [galerieId, setGalerieId] = useState('')
  const [enTeleversementImage, setEnTeleversementImage] = useState(false)
  const [erreurImage, setErreurImage] = useState<string | null>(null)

  const { data: article, isLoading } = useQuery({
    queryKey: ['backoffice-article', id],
    queryFn: () => requeteApi<ArticleBackoffice>(`/backoffice/articles/${id}`),
    enabled: !estNouveau,
  })

  const { data: galeries } = useQuery({
    queryKey: ['backoffice-galeries'],
    queryFn: () => requeteApi<Pagination<Galerie>>('/backoffice/galeries'),
  })

  const { data: versions, refetch: refetchVersions } = useQuery({
    queryKey: ['backoffice-article-versions', id],
    queryFn: () => requeteApi<VersionContenu[]>(`/backoffice/articles/${id}/versions`),
    enabled: !estNouveau,
  })

  useEffect(() => {
    if (article) {
      setChamps({
        titre: article.titre,
        slug: article.slug,
        chapo: article.chapo,
        contenu: article.contenu,
        meta_titre: article.meta_titre,
        meta_description: article.meta_description,
      })
      setGalerieId(article.galerie ?? '')
    }
  }, [article])

  const peutRediger = possedeScope('contenus:rediger')

  function majChamp(champ: keyof Formulaire, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function enregistrer() {
    setEnregistrement(true)
    setErreurs({})
    try {
      const charge = { ...champs, galerie: galerieId || null }
      if (estNouveau) {
        const cree = await requeteApi<ArticleBackoffice>('/backoffice/articles', {
          method: 'POST',
          body: JSON.stringify(charge),
        })
        navigate(`/articles/${cree.id}`, { replace: true })
      } else {
        await requeteApi(`/backoffice/articles/${id}`, { method: 'PATCH', body: JSON.stringify(charge) })
        await queryClient.invalidateQueries({ queryKey: ['backoffice-article', id] })
        await refetchVersions()
        setMessageAction('Modifications enregistrées.')
      }
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

  async function televerserImage(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier || estNouveau) return
    setErreurImage(null)
    setEnTeleversementImage(true)
    try {
      const donnees = new FormData()
      donnees.append('image', fichier)
      await requeteApiFichier(`/backoffice/articles/${id}/image`, donnees)
      await queryClient.invalidateQueries({ queryKey: ['backoffice-article', id] })
    } catch (err) {
      setErreurImage(
        err instanceof ApiError
          ? (err.probleme.erreurs_champs?.image?.[0] ?? err.probleme.detail ?? "L'image n'a pas pu être envoyée.")
          : "L'image n'a pas pu être envoyée.",
      )
    } finally {
      setEnTeleversementImage(false)
    }
  }

  async function supprimerImage() {
    await requeteApi(`/backoffice/articles/${id}/image`, { method: 'DELETE' })
    await queryClient.invalidateQueries({ queryKey: ['backoffice-article', id] })
  }

  async function appliquerTransition(action: string) {
    setMessageAction(null)
    try {
      await requeteApi(`/backoffice/articles/${id}/transition`, { method: 'POST', body: JSON.stringify({ action }) })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-article', id] })
      await refetchVersions()
      setMessageAction('Transition appliquée.')
    } catch {
      setMessageAction("Cette action n'a pas pu être appliquée (droits insuffisants ou statut modifié entre-temps).")
    }
  }

  async function restaurerVersion(numero: number) {
    await requeteApi(`/backoffice/articles/${id}/versions/${numero}/restaurer`, { method: 'POST' })
    await queryClient.invalidateQueries({ queryKey: ['backoffice-article', id] })
    await refetchVersions()
  }

  if (!estNouveau && isLoading) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  const actionsDisponibles = article ? ACTIONS_PAR_STATUT[article.statut] : []

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Contenus éditoriaux
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          {estNouveau ? 'Nouvel article' : 'Modifier l’article'}
        </h1>
        {article && <Badge ton={TON_PAR_STATUT[article.statut]} libelle={LIBELLES_STATUT[article.statut]} />}
      </motion.div>

      {article && article.statut !== 'PUBLIE' && (
        <p className="mt-4 max-w-2xl rounded-bouton border border-warning bg-warning/10 px-4 py-3 font-corps text-sm text-warning">
          {article.statut === 'BROUILLON'
            ? "Cet article est en brouillon — invisible sur le portail tant qu'il n'est pas passé au statut « Publié » via le circuit de validation ci-dessous."
            : `Statut « ${LIBELLES_STATUT[article.statut]} » — cet article n'apparaît pas encore sur le portail public.`}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <fieldset disabled={!peutRediger} className="flex flex-col gap-5">
            <ChampTexte
              etiquette="Titre"
              required
              value={champs.titre}
              onChange={(e) => majChamp('titre', e.target.value)}
              erreur={erreurs.titre}
            />
            <ChampTexte
              etiquette="Slug (URL)"
              required
              value={champs.slug}
              onChange={(e) => majChamp('slug', e.target.value)}
              erreur={erreurs.slug}
            />
            <ChampTexte
              etiquette="Chapô (résumé)"
              value={champs.chapo}
              onChange={(e) => majChamp('chapo', e.target.value)}
              erreur={erreurs.chapo}
            />
            <div className="flex flex-col gap-1.5">
              <span className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Image à la une
              </span>
              {article?.image_url && (
                <div className="relative w-full max-w-xs overflow-hidden rounded-carte border border-border dark:border-border-dark">
                  <img src={article.image_url} alt="" className="aspect-video w-full object-cover" />
                  <button
                    type="button"
                    onClick={supprimerImage}
                    aria-label="Supprimer l'image à la une"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-error"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
              {estNouveau ? (
                <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  Enregistrez d'abord l'article pour pouvoir y ajouter une image.
                </p>
              ) : (
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-bouton border border-border px-3 py-2 font-corps text-sm font-medium text-text-strong hover:bg-surface-tint dark:border-border-dark dark:text-text-inv-strong dark:hover:bg-white/5">
                  <Upload size={16} aria-hidden="true" />
                  {enTeleversementImage ? 'Envoi en cours…' : article?.image_url ? 'Changer' : 'Téléverser une image'}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={televerserImage}
                    disabled={enTeleversementImage}
                    className="sr-only"
                  />
                </label>
              )}
              {erreurImage && (
                <span role="alert" className="font-corps text-sm text-error">
                  {erreurImage}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contenu" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Contenu
              </label>
              <textarea
                id="contenu"
                rows={12}
                value={champs.contenu}
                onChange={(e) => majChamp('contenu', e.target.value)}
                className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="galerie" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Galerie associée (images/vidéos complémentaires)
              </label>
              <select
                id="galerie"
                value={galerieId}
                onChange={(e) => setGalerieId(e.target.value)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                <option value="">Aucune</option>
                {galeries?.results.map((galerie) => (
                  <option key={galerie.id} value={galerie.id}>
                    {galerie.titre}
                  </option>
                ))}
              </select>
              <Link
                to="/galeries"
                className="self-start font-corps text-xs font-medium text-primary hover:underline dark:text-accent-soft"
              >
                Gérer les galeries
              </Link>
            </div>
            <ChampTexte
              etiquette="Méta-titre (SEO)"
              value={champs.meta_titre}
              onChange={(e) => majChamp('meta_titre', e.target.value)}
            />
            <ChampTexte
              etiquette="Méta-description (SEO)"
              value={champs.meta_description}
              onChange={(e) => majChamp('meta_description', e.target.value)}
            />
          </fieldset>

          {!peutRediger && (
            <p className="mt-3 font-corps text-xs text-text-muted dark:text-text-inv-muted">
              Vous n'avez pas le droit de modifier ce contenu (scope « contenus:rediger » requis).
            </p>
          )}

          {peutRediger && (
            <Bouton onClick={enregistrer} disabled={enregistrement} className="mt-6">
              {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
            </Bouton>
          )}

          {messageAction && <p className="mt-3 font-corps text-sm text-text-body dark:text-text-inv-body">{messageAction}</p>}
        </div>

        <div className="flex flex-col gap-6">
          {!estNouveau && actionsDisponibles.length > 0 && (
            <Carte>
              <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                Workflow
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {actionsDisponibles.map(({ action, libelle }) => (
                  <button
                    key={action}
                    type="button"
                    disabled={!possedeScope(SCOPE_PAR_ACTION[action] ?? '')}
                    onClick={() => appliquerTransition(action)}
                    className="rounded-bouton border border-border px-3 py-2 text-left font-corps text-sm font-medium text-text-strong
                               transition-colors duration-200 ease-dgap hover:bg-surface-tint disabled:cursor-not-allowed disabled:opacity-40
                               dark:border-border-dark dark:text-text-inv-strong dark:hover:bg-white/5"
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            </Carte>
          )}

          {!estNouveau && (
            <Carte>
              <h2 className="flex items-center gap-2 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                <History size={16} aria-hidden="true" />
                Historique des versions
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {versions?.map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0 dark:border-border-dark">
                    <div className="min-w-0">
                      <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                        Version {v.numero}
                      </p>
                      <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                        {v.commentaire} — {v.auteur_nom ?? 'Système'}
                      </p>
                    </div>
                    {peutRediger && (
                      <button
                        type="button"
                        onClick={() => restaurerVersion(v.numero)}
                        aria-label={`Restaurer la version ${v.numero}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-tint hover:text-primary
                                   dark:text-text-inv-muted dark:hover:bg-white/5"
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Carte>
          )}
        </div>
      </div>
    </section>
  )
}
