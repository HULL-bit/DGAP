import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { ChampTexte, Bouton, propsApparition } from '@dgap/ui'
import type { CandidatureAccuse, CandidatureCreation, Concours } from '../types/api'

interface FormulaireCandidature {
  candidat_nom: string
  candidat_prenom: string
  candidat_email: string
  candidat_telephone: string
  niveau_etude: string
  experience: string
}

const FORMULAIRE_VIDE: FormulaireCandidature = {
  candidat_nom: '',
  candidat_prenom: '',
  candidat_email: '',
  candidat_telephone: '',
  niveau_etude: '',
  experience: '',
}

const ETAPES = ['Votre identité', 'Votre situation', 'Récapitulatif'] as const

const EXTENSIONS_AUTORISEES = ['.jpg', '.jpeg', '.png', '.pdf']
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024

function champsRequisParEtape(etape: number): (keyof FormulaireCandidature)[] {
  switch (etape) {
    case 0:
      return ['candidat_nom', 'candidat_prenom', 'candidat_email', 'candidat_telephone']
    case 1:
      return ['niveau_etude']
    default:
      return []
  }
}

export function CandidatureNouvelle() {
  const { code } = useParams<{ code: string }>()

  const { data: concours, isLoading: chargementConcours } = useQuery({
    queryKey: ['concours', code],
    queryFn: () => requeteApi<Concours>(`/concours/${code}`),
    enabled: Boolean(code),
    retry: false,
  })

  const [etape, setEtape] = useState(0)
  const [champs, setChamps] = useState<FormulaireCandidature>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireCandidature, string>>>({})
  const [enEnvoi, setEnEnvoi] = useState(false)
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null)
  const [accuse, setAccuse] = useState<CandidatureAccuse | null>(null)
  const cleIdempotence = useMemo(() => crypto.randomUUID(), [])

  const [fichierPiece, setFichierPiece] = useState<File | null>(null)
  const [erreurPiece, setErreurPiece] = useState<string | null>(null)
  const [enTeleversement, setEnTeleversement] = useState(false)
  const [pieceEnvoyee, setPieceEnvoyee] = useState(false)

  const [enPaiement, setEnPaiement] = useState(false)
  const [paiementConfirme, setPaiementConfirme] = useState(false)

  function majChamp(champ: keyof FormulaireCandidature, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  function etapeValide(cible: number): boolean {
    const requis = champsRequisParEtape(cible)
    const manquants: Partial<Record<keyof FormulaireCandidature, string>> = {}
    for (const champ of requis) {
      if (!champs[champ].trim()) manquants[champ] = 'Ce champ est requis.'
    }
    setErreurs(manquants)
    return Object.keys(manquants).length === 0
  }

  function suivant() {
    if (!etapeValide(etape)) return
    setEtape((e) => Math.min(e + 1, ETAPES.length - 1))
  }

  function precedent() {
    setErreurs({})
    setEtape((e) => Math.max(e - 1, 0))
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!concours || !etapeValide(1)) {
      setEtape(1)
      return
    }
    setErreurGenerale(null)
    setEnEnvoi(true)
    try {
      const charge: CandidatureCreation = { ...champs, concours: concours.id }
      const reponse = await requeteApi<CandidatureAccuse>('/candidatures', {
        method: 'POST',
        body: JSON.stringify(charge),
        headers: { 'Idempotency-Key': cleIdempotence },
      })
      setAccuse(reponse)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireCandidature, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireCandidature] = messages[0]
        }
        setErreurs(parChamp)
      } else {
        setErreurGenerale("Votre candidature n'a pas pu être envoyée. Veuillez réessayer.")
      }
    } finally {
      setEnEnvoi(false)
    }
  }

  function choisirPiece(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0] ?? null
    setErreurPiece(null)
    if (fichier) {
      const nomMinuscule = fichier.name.toLowerCase()
      if (!EXTENSIONS_AUTORISEES.some((ext) => nomMinuscule.endsWith(ext))) {
        setErreurPiece('Formats acceptés : JPG, PNG, PDF.')
        setFichierPiece(null)
        return
      }
      if (fichier.size > TAILLE_MAX_OCTETS) {
        setErreurPiece('Fichier trop volumineux (8 Mo maximum).')
        setFichierPiece(null)
        return
      }
    }
    setFichierPiece(fichier)
  }

  async function televerserPiece() {
    if (!accuse || !fichierPiece) return
    setErreurPiece(null)
    setEnTeleversement(true)
    try {
      const donnees = new FormData()
      donnees.append('type_piece', 'CV')
      donnees.append('fichier', fichierPiece)
      await requeteApiFichier(`/candidatures/${accuse.id}/pieces`, donnees)
      setPieceEnvoyee(true)
    } catch {
      setErreurPiece("Le fichier n'a pas pu être envoyé. Veuillez réessayer.")
    } finally {
      setEnTeleversement(false)
    }
  }

  async function payer() {
    if (!accuse) return
    setEnPaiement(true)
    try {
      await requeteApi(`/candidatures/${accuse.numero_suivi}/paiement/confirmer-mock`, {
        method: 'POST',
        body: JSON.stringify({ code: accuse.code_suivi }),
      })
      setPaiementConfirme(true)
    } finally {
      setEnPaiement(false)
    }
  }

  if (!chargementConcours && !concours) {
    return <Navigate to="/concours" replace />
  }

  return (
    <>
      <Helmet>
        <title>
          {concours ? `${concours.titre} — Inscription` : 'Inscription au concours'} — Direction Générale de
          l'Administration Pénitentiaire
        </title>
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              {concours?.titre ?? 'Inscription au concours'}
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Un numéro et un code de suivi vous seront délivrés à la fin.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-12 sm:px-8">
        <div className="max-w-xl">
          {accuse ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-carte border border-success/30 bg-success/5 p-6"
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 size={20} aria-hidden="true" />
                <p className="font-titre text-base font-semibold">Candidature envoyée</p>
              </div>
              <p className="mt-3 font-corps text-sm text-text-body dark:text-text-inv-body">
                Numéro de suivi :{' '}
                <strong className="font-mono text-text-strong dark:text-text-inv-strong">
                  {accuse.numero_suivi}
                </strong>
              </p>
              <p className="mt-1 font-corps text-sm text-text-body dark:text-text-inv-body">
                Code de suivi :{' '}
                <strong className="font-mono text-text-strong dark:text-text-inv-strong">
                  {accuse.code_suivi}
                </strong>
              </p>
              <p className="mt-3 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                Conservez ces deux références : elles vous permettront de suivre votre candidature et
                de télécharger votre convocation.
              </p>

              {accuse.paiement && (
                <div className="mt-5 border-t border-success/20 pt-5">
                  <p className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                    Frais d'inscription : {accuse.paiement.montant} FCFA
                  </p>
                  {paiementConfirme || accuse.paiement.statut === 'PAYE' ? (
                    <p className="mt-2 font-corps text-sm text-success">Paiement confirmé.</p>
                  ) : (
                    <Bouton type="button" taille="sm" variante="secondaire" className="mt-3" onClick={payer} disabled={enPaiement}>
                      <CreditCard size={16} aria-hidden="true" />
                      {enPaiement ? 'Confirmation…' : 'Payer maintenant (simulation)'}
                    </Bouton>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-success/20 pt-5">
                {pieceEnvoyee ? (
                  <p className="font-corps text-sm text-success">
                    Pièce reçue. Elle sera vérifiée lors de l'instruction.
                  </p>
                ) : (
                  <>
                    <p className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                      Joindre votre CV (facultatif)
                    </p>
                    <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      JPG, PNG ou PDF, 8 Mo maximum. Vous pourrez aussi l'ajouter plus tard.
                    </p>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={choisirPiece}
                      aria-label="Pièce jointe"
                      className="mt-3 block w-full font-corps text-sm text-text-body file:mr-3 file:rounded-bouton file:border-0 file:bg-primary file:px-3 file:py-2 file:font-titre file:font-semibold file:text-white dark:text-text-inv-body"
                    />
                    {erreurPiece && (
                      <p role="alert" className="mt-2 font-corps text-sm text-error">
                        {erreurPiece}
                      </p>
                    )}
                    <Bouton
                      type="button"
                      taille="sm"
                      variante="secondaire"
                      className="mt-3"
                      disabled={!fichierPiece || enTeleversement}
                      onClick={televerserPiece}
                    >
                      <Upload size={16} aria-hidden="true" />
                      {enTeleversement ? 'Envoi en cours…' : 'Téléverser'}
                    </Bouton>
                  </>
                )}
              </div>

              <Link
                to="/concours/suivi"
                className="mt-4 inline-block font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                Suivre ma candidature
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={soumettre} className="flex flex-col gap-6" noValidate>
              <div>
                <p className="font-corps text-xs font-medium uppercase tracking-wide text-primary dark:text-accent-soft">
                  Étape {etape + 1} / {ETAPES.length} — {ETAPES[etape]}
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-surface-tint dark:bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-[width] duration-300 ease-dgap dark:bg-accent-soft"
                    style={{ width: `${((etape + 1) / ETAPES.length) * 100}%` }}
                  />
                </div>
              </div>

              {etape === 0 && (
                <div className="flex flex-col gap-5">
                  <ChampTexte
                    etiquette="Votre nom"
                    required
                    value={champs.candidat_nom}
                    onChange={(e) => majChamp('candidat_nom', e.target.value)}
                    erreur={erreurs.candidat_nom}
                  />
                  <ChampTexte
                    etiquette="Votre prénom"
                    required
                    value={champs.candidat_prenom}
                    onChange={(e) => majChamp('candidat_prenom', e.target.value)}
                    erreur={erreurs.candidat_prenom}
                  />
                  <ChampTexte
                    etiquette="Adresse e-mail"
                    type="email"
                    required
                    value={champs.candidat_email}
                    onChange={(e) => majChamp('candidat_email', e.target.value)}
                    erreur={erreurs.candidat_email}
                  />
                  <ChampTexte
                    etiquette="Téléphone"
                    type="tel"
                    required
                    value={champs.candidat_telephone}
                    onChange={(e) => majChamp('candidat_telephone', e.target.value)}
                    erreur={erreurs.candidat_telephone}
                  />
                </div>
              )}

              {etape === 1 && (
                <div className="flex flex-col gap-5">
                  <ChampTexte
                    etiquette="Niveau d'étude"
                    required
                    value={champs.niveau_etude}
                    onChange={(e) => majChamp('niveau_etude', e.target.value)}
                    erreur={erreurs.niveau_etude}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="experience" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                      Expérience professionnelle (facultative)
                    </label>
                    <textarea
                      id="experience"
                      rows={5}
                      value={champs.experience}
                      onChange={(e) => majChamp('experience', e.target.value)}
                      className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                                 dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                    />
                  </div>
                </div>
              )}

              {etape === 2 && (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-carte border border-border p-5 font-corps text-sm dark:border-border-dark sm:grid-cols-2">
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Candidat</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">
                      {champs.candidat_prenom} {champs.candidat_nom}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Coordonnées</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">
                      {champs.candidat_email} · {champs.candidat_telephone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Niveau d'étude</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">{champs.niveau_etude}</dd>
                  </div>
                  {concours && Number(concours.frais_inscription) > 0 && (
                    <div>
                      <dt className="text-text-muted dark:text-text-inv-muted">Frais d'inscription</dt>
                      <dd className="text-text-strong dark:text-text-inv-strong">
                        {concours.frais_inscription} FCFA
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {erreurGenerale && (
                <p role="alert" className="font-corps text-sm text-error">
                  {erreurGenerale}
                </p>
              )}

              <div className="flex items-center justify-between">
                <Bouton type="button" variante="discret" onClick={precedent} disabled={etape === 0 || enEnvoi}>
                  <ChevronLeft size={18} aria-hidden="true" />
                  Précédent
                </Bouton>

                {etape < ETAPES.length - 1 ? (
                  <Bouton type="button" onClick={suivant}>
                    Suivant
                    <ChevronRight size={18} aria-hidden="true" />
                  </Bouton>
                ) : (
                  <Bouton type="submit" disabled={enEnvoi}>
                    {enEnvoi ? 'Envoi en cours…' : 'Envoyer la candidature'}
                  </Bouton>
                )}
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
