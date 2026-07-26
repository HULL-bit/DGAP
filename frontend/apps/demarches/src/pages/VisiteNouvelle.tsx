import { useMemo, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { ChampTexte, Bouton, propsApparition } from '@dgap/ui'
import type { DemandeVisiteAccuse, DemandeVisiteCreation, Etablissement, Pagination } from '../types/api'

interface FormulaireVisite {
  visiteur_nom: string
  visiteur_prenom: string
  visiteur_email: string
  visiteur_telephone: string
  lien_parente: string
  detenu_nom_declare: string
  detenu_prenom_declare: string
  etablissement: string
  date_souhaitee: string
}

const FORMULAIRE_VIDE: FormulaireVisite = {
  visiteur_nom: '',
  visiteur_prenom: '',
  visiteur_email: '',
  visiteur_telephone: '',
  lien_parente: '',
  detenu_nom_declare: '',
  detenu_prenom_declare: '',
  etablissement: '',
  date_souhaitee: '',
}

const ETAPES = [
  'Votre identité',
  'Vos coordonnées',
  'Lien de parenté',
  'Personne détenue',
  'Établissement et date',
  'Récapitulatif',
] as const

const CLASSE_SELECT =
  'min-h-[44px] rounded-bouton border bg-white px-3 py-2 font-corps text-base text-text-body ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'dark:bg-white/5 dark:text-text-inv-body border-border dark:border-border-dark'

function champsRequisParEtape(etape: number): (keyof FormulaireVisite)[] {
  switch (etape) {
    case 0:
      return ['visiteur_nom', 'visiteur_prenom']
    case 1:
      return ['visiteur_email', 'visiteur_telephone']
    case 2:
      return ['lien_parente']
    case 3:
      return ['detenu_nom_declare', 'detenu_prenom_declare']
    case 4:
      return ['etablissement', 'date_souhaitee']
    default:
      return []
  }
}

export function VisiteNouvelle() {
  const [etape, setEtape] = useState(0)
  const [champs, setChamps] = useState<FormulaireVisite>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireVisite, string>>>({})
  const [enEnvoi, setEnEnvoi] = useState(false)
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null)
  const [accuse, setAccuse] = useState<DemandeVisiteAccuse | null>(null)
  const cleIdempotence = useMemo(() => crypto.randomUUID(), [])

  const { data: etablissements, isLoading: chargementEtablissements } = useQuery({
    queryKey: ['etablissements', 'visite-nouvelle'],
    queryFn: () => requeteApi<Pagination<Etablissement>>('/etablissements?limit=100'),
  })

  function majChamp(champ: keyof FormulaireVisite, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  function etapeValide(cible: number): boolean {
    const requis = champsRequisParEtape(cible)
    const manquants: Partial<Record<keyof FormulaireVisite, string>> = {}
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
    if (!etapeValide(4)) {
      setEtape(4)
      return
    }
    setErreurGenerale(null)
    setEnEnvoi(true)
    try {
      const charge: DemandeVisiteCreation = { ...champs }
      const reponse = await requeteApi<DemandeVisiteAccuse>('/demandes-visite', {
        method: 'POST',
        body: JSON.stringify(charge),
        headers: { 'Idempotency-Key': cleIdempotence },
      })
      setAccuse(reponse)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireVisite, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireVisite] = messages[0]
        }
        setErreurs(parChamp)
      } else {
        setErreurGenerale("Votre demande n'a pas pu être envoyée. Veuillez réessayer.")
      }
    } finally {
      setEnEnvoi(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Demande de visite — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Déposez une demande de visite en ligne et suivez-la grâce à un numéro et un code de suivi."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Demande de visite
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Formulaire en 6 étapes. Un numéro et un code de suivi vous seront délivrés à la fin.
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
                <p className="font-titre text-base font-semibold">Demande envoyée</p>
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
                Conservez ces deux références : elles vous permettront de suivre votre demande et,
                une fois le permis délivré, de le télécharger.
              </p>
              <Link
                to="/visites/suivi"
                className="mt-4 inline-block font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                Suivre ma demande
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
                    value={champs.visiteur_nom}
                    onChange={(e) => majChamp('visiteur_nom', e.target.value)}
                    erreur={erreurs.visiteur_nom}
                  />
                  <ChampTexte
                    etiquette="Votre prénom"
                    required
                    value={champs.visiteur_prenom}
                    onChange={(e) => majChamp('visiteur_prenom', e.target.value)}
                    erreur={erreurs.visiteur_prenom}
                  />
                </div>
              )}

              {etape === 1 && (
                <div className="flex flex-col gap-5">
                  <ChampTexte
                    etiquette="Adresse e-mail"
                    type="email"
                    required
                    value={champs.visiteur_email}
                    onChange={(e) => majChamp('visiteur_email', e.target.value)}
                    erreur={erreurs.visiteur_email}
                  />
                  <ChampTexte
                    etiquette="Téléphone"
                    type="tel"
                    required
                    value={champs.visiteur_telephone}
                    onChange={(e) => majChamp('visiteur_telephone', e.target.value)}
                    erreur={erreurs.visiteur_telephone}
                  />
                </div>
              )}

              {etape === 2 && (
                <div className="flex flex-col gap-5">
                  <ChampTexte
                    etiquette="Lien de parenté avec la personne détenue"
                    aide="Exemple : épouse, père, frère, ami…"
                    required
                    value={champs.lien_parente}
                    onChange={(e) => majChamp('lien_parente', e.target.value)}
                    erreur={erreurs.lien_parente}
                  />
                </div>
              )}

              {etape === 3 && (
                <div className="flex flex-col gap-5">
                  <ChampTexte
                    etiquette="Nom de la personne détenue"
                    required
                    value={champs.detenu_nom_declare}
                    onChange={(e) => majChamp('detenu_nom_declare', e.target.value)}
                    erreur={erreurs.detenu_nom_declare}
                  />
                  <ChampTexte
                    etiquette="Prénom de la personne détenue"
                    required
                    value={champs.detenu_prenom_declare}
                    onChange={(e) => majChamp('detenu_prenom_declare', e.target.value)}
                    erreur={erreurs.detenu_prenom_declare}
                  />
                </div>
              )}

              {etape === 4 && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="etablissement"
                      className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong"
                    >
                      Établissement pénitentiaire
                    </label>
                    <select
                      id="etablissement"
                      required
                      value={champs.etablissement}
                      onChange={(e) => majChamp('etablissement', e.target.value)}
                      className={CLASSE_SELECT}
                    >
                      <option value="">
                        {chargementEtablissements ? 'Chargement…' : 'Sélectionnez un établissement'}
                      </option>
                      {etablissements?.results.map((etab) => (
                        <option key={etab.id} value={etab.id}>
                          {etab.nom}
                        </option>
                      ))}
                    </select>
                    {erreurs.etablissement && (
                      <span role="alert" className="font-corps text-sm text-error">
                        {erreurs.etablissement}
                      </span>
                    )}
                  </div>
                  <ChampTexte
                    etiquette="Date souhaitée"
                    type="date"
                    required
                    value={champs.date_souhaitee}
                    onChange={(e) => majChamp('date_souhaitee', e.target.value)}
                    erreur={erreurs.date_souhaitee}
                  />
                </div>
              )}

              {etape === 5 && (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-carte border border-border p-5 font-corps text-sm dark:border-border-dark sm:grid-cols-2">
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Visiteur</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">
                      {champs.visiteur_prenom} {champs.visiteur_nom}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Coordonnées</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">
                      {champs.visiteur_email} · {champs.visiteur_telephone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Lien de parenté</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">{champs.lien_parente}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Personne détenue</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">
                      {champs.detenu_prenom_declare} {champs.detenu_nom_declare}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Établissement</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">
                      {etablissements?.results.find((e) => e.id === champs.etablissement)?.nom ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted dark:text-text-inv-muted">Date souhaitée</dt>
                    <dd className="text-text-strong dark:text-text-inv-strong">{champs.date_souhaitee}</dd>
                  </div>
                </dl>
              )}

              {erreurGenerale && (
                <p role="alert" className="font-corps text-sm text-error">
                  {erreurGenerale}
                </p>
              )}

              <div className="flex items-center justify-between">
                <Bouton
                  type="button"
                  variante="discret"
                  onClick={precedent}
                  disabled={etape === 0 || enEnvoi}
                >
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
                    {enEnvoi ? 'Envoi en cours…' : 'Envoyer la demande'}
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
