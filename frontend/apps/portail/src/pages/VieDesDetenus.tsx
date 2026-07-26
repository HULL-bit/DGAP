import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { UserCheck, HeartPulse, Sun, Users, Mail, Package, BookOpen } from 'lucide-react'
import { propsApparition, Carte } from '@dgap/ui'

interface Rubrique {
  icone: LucideIcon
  titre: string
  points: string[]
}

/**
 * Contenu repris et réécrit en français accessible (§14.2) à partir des rubriques
 * publiées par l'institution — aucune donnée inventée (§14.3). Les délais/plages
 * horaires exacts restent à confirmer par la DGAP avant mise en production finale.
 */
const rubriques: Rubrique[] = [
  {
    icone: UserCheck,
    titre: 'Accueil et admission',
    points: [
      "L'arrivée d'une personne détenue suit une procédure rigoureuse.",
      'Vérification de son identité et des pièces de son dossier de détention.',
      'Fouille de sécurité et examen médical.',
      "Information sur le règlement intérieur de l'établissement et sur ses droits et devoirs.",
    ],
  },
  {
    icone: HeartPulse,
    titre: 'Hygiène et soins médicaux',
    points: [
      'Hygiène corporelle quotidienne et lessive hebdomadaire.',
      "Entretien des cellules et des parties communes assuré par les personnes détenues.",
      "Un médecin généraliste intervient dans chaque établissement, ou à défaut un infirmier.",
      'Couverture médicale assurée pour toutes les personnes détenues.',
    ],
  },
  {
    icone: Sun,
    titre: 'Temps de promenade',
    points: [
      'Deux heures de promenade le matin et deux heures l’après-midi.',
      "Ces plages peuvent être ajustées par le chef d'établissement selon les contraintes locales.",
    ],
  },
  {
    icone: Users,
    titre: 'Visites',
    points: [
      'Visites familiales hebdomadaires, sur présentation d’un permis de communiquer et d’une pièce d’identité.',
      'Visites d’avocats sur présentation d’un justificatif professionnel et d’une lettre de constitution.',
    ],
  },
  {
    icone: Mail,
    titre: 'Correspondance',
    points: [
      'Chaque personne détenue peut écrire librement, sans limite quotidienne.',
      'Le courrier reçu est soumis à contrôle, sauf celui provenant des autorités judiciaires et des avocats.',
    ],
  },
  {
    icone: Package,
    titre: 'Colis autorisés',
    points: [
      'Denrées alimentaires non entamées, vêtements, livres et matériel d’étude.',
      'Tout colis fait l’objet d’un contrôle avant remise à son destinataire.',
    ],
  },
  {
    icone: BookOpen,
    titre: 'Pratique religieuse',
    points: [
      "Chaque personne détenue peut pratiquer son culte, dans la mesure où cela ne trouble pas l'ordre de l'établissement.",
      'Objets religieux autorisés : Coran, Bible, chapelet, tapis de prière.',
    ],
  },
]

export function VieDesDetenus() {
  return (
    <>
      <Helmet>
        <title>Vie des détenus — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Règles de vie en détention : admission, hygiène et soins, promenade, visites, correspondance, colis et pratique religieuse."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">Vie des détenus</h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Les règles de vie en détention, présentées simplement : admission, hygiène et soins,
              promenade, visites, correspondance, colis et pratique religieuse.
            </p>
          </motion.div>
        </div>
      </section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <div className="grid gap-6 md:grid-cols-2">
          {rubriques.map((r, i) => (
            <motion.div
              key={r.titre}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (i % 2) * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Carte className="h-full">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-tint text-primary">
                    <r.icone size={22} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h2 className="font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">{r.titre}</h2>
                </div>
                <ul className="mt-4 space-y-2 font-corps text-sm leading-relaxed text-text-body dark:text-text-inv-body">
                  {r.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Carte>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 font-corps text-xs text-text-muted dark:text-text-inv-muted">
          Contenu de référence — les modalités précises (horaires, formulaires) peuvent varier selon
          l'établissement ; se rapprocher du greffe concerné ou consulter la page « Vos démarches ».
        </p>
      </motion.section>
    </>
  )
}
