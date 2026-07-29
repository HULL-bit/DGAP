import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { requeteApi } from '@dgap/api-client'
import { Badge, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { DemandeVisiteInstruction, Pagination, StatutDemandeVisite } from '../types/api'
import { LIBELLES_STATUT_VISITE } from '../types/api'

const TON_PAR_STATUT: Record<StatutDemandeVisite, TonBadge> = {
  SOUMISE: 'neutre',
  EN_INSTRUCTION: 'attente',
  PIECES_MANQUANTES: 'alerte',
  VALIDEE: 'attente',
  REJETEE: 'erreur',
  PERMIS_DELIVRE: 'succes',
}

const FILTRES: { valeur: StatutDemandeVisite | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'SOUMISE', libelle: 'Soumises' },
  { valeur: 'EN_INSTRUCTION', libelle: 'En instruction' },
  { valeur: 'PIECES_MANQUANTES', libelle: 'Pièces manquantes' },
  { valeur: 'VALIDEE', libelle: 'Validées' },
  { valeur: 'REJETEE', libelle: 'Rejetées' },
  { valeur: 'PERMIS_DELIVRE', libelle: 'Permis délivrés' },
]

export function VisitesListe() {
  const [filtre, setFiltre] = useState<StatutDemandeVisite | ''>('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backoffice-visites', filtre],
    queryFn: () =>
      requeteApi<Pagination<DemandeVisiteInstruction>>(
        `/demandes-visite/instruction${filtre ? `?statut=${filtre}` : ''}`,
      ),
  })

  const demandes = data?.results ?? []

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          Instruction des demandes de visite
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Demandes déposées en ligne — instruction, pièces, délivrance du permis (§7.3).
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
        <p className="mt-8 font-corps text-sm text-error">Impossible de charger les demandes de visite.</p>
      )}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {demandes.map((demande) => (
          <motion.div key={demande.id} variants={elementEnCascade}>
            <Link
              to={`/visites/${demande.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                  {demande.numero_suivi} — {demande.visiteur_prenom} {demande.visiteur_nom}
                </p>
                <p className="mt-1 truncate font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  {demande.etablissement.nom} · Visite souhaitée le{' '}
                  {new Date(demande.date_souhaitee).toLocaleDateString('fr-SN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Badge ton={TON_PAR_STATUT[demande.statut]} libelle={LIBELLES_STATUT_VISITE[demande.statut]} />
            </Link>
          </motion.div>
        ))}
        {!isLoading && demandes.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune demande.</p>
        )}
      </motion.div>
    </section>
  )
}
