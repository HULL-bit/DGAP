import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, ShieldCheck, User } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { Pagination, UtilisateurAdmin } from '../types/api'

interface Formulaire {
  email: string
  nom: string
  prenom: string
  matricule: string
  est_agent_interne: boolean
  mot_de_passe: string
}

const FORMULAIRE_VIDE: Formulaire = {
  email: '',
  nom: '',
  prenom: '',
  matricule: '',
  est_agent_interne: true,
  mot_de_passe: '',
}

export function Comptes() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['comptes-admin', recherche],
    queryFn: () =>
      requeteApi<Pagination<UtilisateurAdmin>>(
        `/backoffice/comptes/utilisateurs${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`,
      ),
  })

  function majChamp<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/comptes/utilisateurs', {
        method: 'POST',
        body: JSON.stringify(champs),
      })
      await queryClient.invalidateQueries({ queryKey: ['comptes-admin'] })
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
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            Comptes
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Administration des comptes et habilitations — jamais exposé côté public.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Créer un compte
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="E-mail"
              type="email"
              required
              value={champs.email}
              onChange={(e) => majChamp('email', e.target.value)}
              erreur={erreurs.email}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte
                etiquette="Nom"
                required
                value={champs.nom}
                onChange={(e) => majChamp('nom', e.target.value)}
                erreur={erreurs.nom}
              />
              <ChampTexte
                etiquette="Prénom"
                required
                value={champs.prenom}
                onChange={(e) => majChamp('prenom', e.target.value)}
                erreur={erreurs.prenom}
              />
            </div>
            <ChampTexte
              etiquette="Matricule (facultatif)"
              value={champs.matricule}
              onChange={(e) => majChamp('matricule', e.target.value)}
              erreur={erreurs.matricule}
            />
            <ChampTexte
              etiquette="Mot de passe initial"
              type="password"
              required
              minLength={8}
              value={champs.mot_de_passe}
              onChange={(e) => majChamp('mot_de_passe', e.target.value)}
              erreur={erreurs.mot_de_passe}
              aide="L'agent devra le changer à sa convenance ; aucun flux d'invitation par e-mail n'est construit dans cette passe."
            />
            <label className="flex items-center gap-2 font-corps text-sm text-text-body dark:text-text-inv-body">
              <input
                type="checkbox"
                checked={champs.est_agent_interne}
                onChange={(e) => majChamp('est_agent_interne', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-accent dark:border-border-dark"
              />
              Compte agent interne (MFA obligatoire, accès intranet/back-office)
            </label>
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer le compte'}
            </Bouton>
          </form>
        </Carte>
      )}

      <div className="mt-6 max-w-md">
        <ChampTexte
          etiquette="Rechercher (nom, prénom, e-mail)"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les comptes.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((compte) => (
          <motion.div key={compte.id} variants={elementEnCascade}>
            <Link
              to={`/comptes/${compte.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                  {compte.est_superviseur_national ? (
                    <ShieldCheck size={18} aria-hidden="true" />
                  ) : (
                    <User size={18} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {compte.prenom} {compte.nom}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {compte.email}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {compte.est_agent_interne && !compte.mfa_active && (
                  <Badge ton="attente" libelle="MFA non activé" />
                )}
                {!compte.is_active && <Badge ton="erreur" libelle="Désactivé" />}
              </div>
            </Link>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun compte.</p>
        )}
      </motion.div>
    </section>
  )
}
