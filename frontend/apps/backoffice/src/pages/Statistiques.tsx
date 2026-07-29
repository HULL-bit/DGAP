import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Search } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Carte, CompteurAnime, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type {
  Repartition,
  StatistiquesConcours,
  StatistiquesVisites,
  StatutCandidature,
  StatutDemandeVisite,
} from '../types/api'
import { LIBELLES_STATUT_CANDIDATURE, LIBELLES_STATUT_VISITE } from '../types/api'

const TON_PAR_STATUT_VISITE: Record<StatutDemandeVisite, TonBadge> = {
  SOUMISE: 'neutre',
  EN_INSTRUCTION: 'attente',
  PIECES_MANQUANTES: 'alerte',
  VALIDEE: 'attente',
  REJETEE: 'erreur',
  PERMIS_DELIVRE: 'succes',
}

const TON_PAR_STATUT_CANDIDATURE: Record<StatutCandidature, TonBadge> = {
  SOUMISE: 'neutre',
  EN_INSTRUCTION: 'attente',
  PIECES_MANQUANTES: 'alerte',
  ADMISSIBLE: 'attente',
  CONVOQUE: 'attente',
  ADMIS: 'succes',
  REJETE: 'erreur',
}

const CLASSE_BARRE_PAR_TON: Record<TonBadge, string> = {
  succes: 'bg-success',
  attente: 'bg-info',
  erreur: 'bg-error',
  alerte: 'bg-warning',
  neutre: 'bg-text-muted dark:bg-text-inv-muted',
}

/** Barre horizontale fine, longueur proportionnelle au maximum de la série — jamais
 * la seule couleur qui porte l'information : le libellé et le total sont toujours
 * imprimés en toutes lettres à côté de la barre. */
function BarreStat({ libelle, total, maximum, classeBarre }: { libelle: string; total: number; maximum: number; classeBarre: string }) {
  const largeur = maximum > 0 ? Math.max(4, Math.round((total / maximum) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate font-corps text-sm text-text-body dark:text-text-inv-body">{libelle}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-tint dark:bg-white/10">
        <div className={`h-full rounded-full ${classeBarre}`} style={{ width: `${largeur}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
        {total}
      </span>
    </div>
  )
}

interface LigneRepartition extends Repartition {
  classeBarre?: string
}

/** `classeBarre` par ligne (répartition par statut, palette réservée) ou uniforme via
 * `classeBarreParDefaut` (répartition par établissement/concours, une seule couleur —
 * ces barres comparent une magnitude entre entités nommées, pas des identités). */
function BlocRepartition({
  titre,
  lignes,
  classeBarreParDefaut = 'bg-primary',
}: {
  titre: string
  lignes: LigneRepartition[]
  classeBarreParDefaut?: string
}) {
  const maximum = Math.max(0, ...lignes.map((l) => l.total))
  return (
    <div>
      <h3 className="font-corps text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
        {titre}
      </h3>
      <div className="mt-3 flex flex-col gap-2.5">
        {lignes.map((ligne) => (
          <BarreStat
            key={ligne.cle}
            libelle={ligne.cle}
            total={ligne.total}
            maximum={maximum}
            classeBarre={ligne.classeBarre ?? classeBarreParDefaut}
          />
        ))}
        {lignes.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune donnée.</p>
        )}
      </div>
    </div>
  )
}

function TableauVisible({ lignes }: { lignes: Repartition[] }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-corps text-xs text-text-muted dark:text-text-inv-muted">
        Vue tableau
      </summary>
      <table className="mt-2 w-full font-corps text-sm">
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.cle} className="border-b border-border last:border-0 dark:border-border-dark">
              <td className="py-1.5 text-text-body dark:text-text-inv-body">{ligne.cle}</td>
              <td className="py-1.5 text-right font-semibold text-text-strong dark:text-text-inv-strong">{ligne.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export function Statistiques() {
  const [etablissement, setEtablissement] = useState('')
  const [concoursCode, setConcoursCode] = useState('')

  const { data: statsVisites, isLoading: chargementVisites } = useQuery({
    queryKey: ['statistiques-visites', etablissement],
    queryFn: () =>
      requeteApi<StatistiquesVisites>(
        `/backoffice/statistiques/visites${etablissement ? `?etablissement=${encodeURIComponent(etablissement)}` : ''}`,
      ),
  })

  const { data: statsConcours, isLoading: chargementConcours } = useQuery({
    queryKey: ['statistiques-concours', concoursCode],
    queryFn: () =>
      requeteApi<StatistiquesConcours>(
        `/backoffice/statistiques/concours${concoursCode ? `?concours=${encodeURIComponent(concoursCode)}` : ''}`,
      ),
  })

  const parStatutVisites = (statsVisites?.par_statut ?? []).map((l) => ({
    ...l,
    libelle: LIBELLES_STATUT_VISITE[l.cle as StatutDemandeVisite] ?? l.cle,
    ton: TON_PAR_STATUT_VISITE[l.cle as StatutDemandeVisite] ?? 'neutre',
  }))
  const parStatutCandidatures = (statsConcours?.par_statut ?? []).map((l) => ({
    ...l,
    libelle: LIBELLES_STATUT_CANDIDATURE[l.cle as StatutCandidature] ?? l.cle,
    ton: TON_PAR_STATUT_CANDIDATURE[l.cle as StatutCandidature] ?? 'neutre',
  }))
  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center gap-2" {...propsApparition()}>
        <BarChart3 size={20} className="text-primary dark:text-accent-soft" aria-hidden="true" />
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">Statistiques</h1>
      </motion.div>
      <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
        Tableaux de bord thématiques calculés sur les données réelles de production (visites, concours).
        Le tableau de bord national (population carcérale) et les autres volets du module M11 ne sont pas
        encore livrés — voir <code className="font-mono">apps/statistiques/README.md</code>.
      </p>

      <motion.div
        className="mt-8 grid gap-6 lg:grid-cols-2"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={elementEnCascade}>
          <Carte>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">Visites</h2>
              <div className="flex w-48 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 dark:border-border-dark">
                <Search size={14} className="text-text-muted dark:text-text-inv-muted" aria-hidden="true" />
                <input
                  value={etablissement}
                  onChange={(e) => setEtablissement(e.target.value)}
                  placeholder="Code établissement"
                  className="w-full bg-transparent font-corps text-xs text-text-body outline-none placeholder:text-text-muted dark:text-text-inv-body"
                />
              </div>
            </div>

            {chargementVisites && <p className="mt-4 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}

            {statsVisites && (
              <>
                <div className="mt-4">
                  <CompteurAnime valeur={statsVisites.total} libelle="Demandes de visite" />
                </div>
                <div className="mt-6">
                  <BlocRepartition
                    titre="Par statut"
                    lignes={parStatutVisites.map((l) => ({
                      cle: l.libelle,
                      total: l.total,
                      classeBarre: CLASSE_BARRE_PAR_TON[l.ton],
                    }))}
                  />
                </div>
                <div className="mt-6">
                  <BlocRepartition titre="Par établissement" lignes={statsVisites.par_etablissement} />
                  <TableauVisible lignes={statsVisites.par_etablissement} />
                </div>
              </>
            )}
          </Carte>
        </motion.div>

        <motion.div variants={elementEnCascade}>
          <Carte>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">Concours</h2>
              <div className="flex w-48 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 dark:border-border-dark">
                <Search size={14} className="text-text-muted dark:text-text-inv-muted" aria-hidden="true" />
                <input
                  value={concoursCode}
                  onChange={(e) => setConcoursCode(e.target.value)}
                  placeholder="Code concours"
                  className="w-full bg-transparent font-corps text-xs text-text-body outline-none placeholder:text-text-muted dark:text-text-inv-body"
                />
              </div>
            </div>

            {chargementConcours && <p className="mt-4 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}

            {statsConcours && (
              <>
                <div className="mt-4">
                  <CompteurAnime valeur={statsConcours.total} libelle="Candidatures" />
                </div>
                <div className="mt-6">
                  <BlocRepartition
                    titre="Par statut"
                    lignes={parStatutCandidatures.map((l) => ({
                      cle: l.libelle,
                      total: l.total,
                      classeBarre: CLASSE_BARRE_PAR_TON[l.ton],
                    }))}
                  />
                </div>
                <div className="mt-6">
                  <BlocRepartition titre="Par concours" lignes={statsConcours.par_concours} />
                  <TableauVisible lignes={statsConcours.par_concours} />
                </div>
              </>
            )}
          </Carte>
        </motion.div>
      </motion.div>
    </section>
  )
}
