import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { requeteApi } from '@dgap/api-client'
import { Badge, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { CandidatureInstruction, Pagination, StatutCandidature } from '../types/api'
import { LIBELLES_STATUT_CANDIDATURE } from '../types/api'

const TON_PAR_STATUT: Record<StatutCandidature, TonBadge> = {
  SOUMISE: 'neutre',
  EN_INSTRUCTION: 'attente',
  PIECES_MANQUANTES: 'alerte',
  ADMISSIBLE: 'attente',
  CONVOQUE: 'attente',
  ADMIS: 'succes',
  REJETE: 'erreur',
}

const FILTRES: { valeur: StatutCandidature | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'SOUMISE', libelle: 'Soumises' },
  { valeur: 'EN_INSTRUCTION', libelle: 'En instruction' },
  { valeur: 'PIECES_MANQUANTES', libelle: 'Pièces manquantes' },
  { valeur: 'ADMISSIBLE', libelle: 'Admissibles' },
  { valeur: 'CONVOQUE', libelle: 'Convoquées' },
  { valeur: 'ADMIS', libelle: 'Admises' },
  { valeur: 'REJETE', libelle: 'Rejetées' },
]

export function CandidaturesListe() {
  const [filtre, setFiltre] = useState<StatutCandidature | ''>('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backoffice-candidatures', filtre],
    queryFn: () =>
      requeteApi<Pagination<CandidatureInstruction>>(
        `/candidatures/instruction${filtre ? `?statut=${filtre}` : ''}`,
      ),
  })

  const candidatures = data?.results ?? []

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          Instruction des candidatures
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Candidatures aux concours — instruction, admissibilité, convocation (§7.4).
        </p>
      </motion.div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.valeur || 'toutes'}
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
      {isError && (
        <p className="mt-8 font-corps text-sm text-error">Impossible de charger les candidatures.</p>
      )}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {candidatures.map((candidature) => (
          <motion.div key={candidature.id} variants={elementEnCascade}>
            <Link
              to={`/candidatures/${candidature.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                  {candidature.numero_suivi} — {candidature.candidat_prenom} {candidature.candidat_nom}
                </p>
                <p className="mt-1 truncate font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  {candidature.concours.titre}
                  {candidature.paiement && candidature.paiement.statut !== 'PAYE' && ' · Paiement en attente'}
                </p>
              </div>
              <Badge
                ton={TON_PAR_STATUT[candidature.statut]}
                libelle={LIBELLES_STATUT_CANDIDATURE[candidature.statut]}
              />
            </Link>
          </motion.div>
        ))}
        {!isLoading && candidatures.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune candidature.</p>
        )}
      </motion.div>
    </section>
  )
}
