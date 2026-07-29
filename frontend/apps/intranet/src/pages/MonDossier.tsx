import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Briefcase, GraduationCap } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { DossierAgentRH } from '../types/api'

export function MonDossier() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rh-mon-dossier'],
    queryFn: () => requeteApi<DossierAgentRH>('/rh/mon-dossier'),
    retry: false,
  })

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.h1
        className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong"
        {...propsApparition()}
      >
        Mon dossier
      </motion.h1>
      <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
        Consultation de votre dossier administratif.
      </p>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {error instanceof ApiError && error.probleme.status === 404 && (
        <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Aucun dossier RH n'est encore associé à votre compte. Contactez le service des ressources
          humaines.
        </p>
      )}

      {data && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Identité
            </h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-corps text-sm">
              <dt className="text-text-muted dark:text-text-inv-muted">Nom</dt>
              <dd className="text-text-body dark:text-text-inv-body">{data.utilisateur_nom}</dd>
              <dt className="text-text-muted dark:text-text-inv-muted">E-mail</dt>
              <dd className="text-text-body dark:text-text-inv-body">{data.utilisateur_email}</dd>
              {data.matricule && (
                <>
                  <dt className="text-text-muted dark:text-text-inv-muted">Matricule</dt>
                  <dd className="text-text-body dark:text-text-inv-body">{data.matricule}</dd>
                </>
              )}
              <dt className="text-text-muted dark:text-text-inv-muted">Corps</dt>
              <dd className="text-text-body dark:text-text-inv-body">{data.corps || '—'}</dd>
              <dt className="text-text-muted dark:text-text-inv-muted">Grade</dt>
              <dd className="text-text-body dark:text-text-inv-body">{data.grade || '—'}</dd>
              <dt className="text-text-muted dark:text-text-inv-muted">Position</dt>
              <dd className="text-text-body dark:text-text-inv-body">{data.position_administrative}</dd>
              {data.date_entree_service && (
                <>
                  <dt className="text-text-muted dark:text-text-inv-muted">Entrée en service</dt>
                  <dd className="text-text-body dark:text-text-inv-body">
                    {new Date(data.date_entree_service).toLocaleDateString('fr-SN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </>
              )}
            </dl>
          </Carte>

          <Carte>
            <h2 className="flex items-center gap-1.5 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              <Briefcase size={14} aria-hidden="true" />
              Historique d'affectation
            </h2>
            <motion.div
              className="mt-3 flex flex-col gap-3"
              variants={conteneurEnCascade()}
              initial="hidden"
              animate="visible"
            >
              {data.affectations.map((affectation) => (
                <motion.div
                  key={affectation.id}
                  variants={elementEnCascade}
                  className="border-b border-border pb-2 last:border-0 dark:border-border-dark"
                >
                  <p className="font-corps text-sm text-text-body dark:text-text-inv-body">
                    {affectation.perimetre_libelle}
                    {affectation.fonction && ` — ${affectation.fonction}`}
                    {affectation.est_active && (
                      <span className="ml-2 rounded-full bg-succes/10 px-2 py-0.5 text-xs font-semibold text-succes">
                        Actuelle
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    Depuis le{' '}
                    {new Date(affectation.date_debut).toLocaleDateString('fr-SN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {affectation.date_fin &&
                      ` jusqu'au ${new Date(affectation.date_fin).toLocaleDateString('fr-SN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}`}
                  </p>
                </motion.div>
              ))}
              {data.affectations.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
                  Aucune affectation enregistrée.
                </p>
              )}
            </motion.div>
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Soldes de congé
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {data.soldes_conge.map((solde) => (
                <div
                  key={solde.annee}
                  className="flex items-center justify-between font-corps text-sm text-text-body dark:text-text-inv-body"
                >
                  <span>{solde.annee}</span>
                  <span>
                    {solde.jours_restants} / {solde.jours_acquis} jours restants
                  </span>
                </div>
              ))}
              {data.soldes_conge.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
                  Aucun solde enregistré.
                </p>
              )}
            </div>
          </Carte>

          {data.diplomes && (
            <Carte>
              <h2 className="flex items-center gap-1.5 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                <GraduationCap size={14} aria-hidden="true" />
                Diplômes
              </h2>
              <p className="mt-3 whitespace-pre-wrap font-corps text-sm text-text-body dark:text-text-inv-body">
                {data.diplomes}
              </p>
            </Carte>
          )}
        </div>
      )}
    </section>
  )
}
