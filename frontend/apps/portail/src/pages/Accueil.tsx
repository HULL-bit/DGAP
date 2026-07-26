import { Helmet } from 'react-helmet-async'
import {
  CalendarCheck,
  GraduationCap,
  Mail,
  MapPin,
  ArrowUpRight,
  Megaphone,
  Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  CarteAction,
  CompteurAnime,
  Carrousel,
  CarrouselMedia,
  type Diapositive,
  propsApparition,
} from '@dgap/ui'
import { URL_DEMARCHES } from '../config'

/**
 * Diapositives du héros média (fil d'actualité en images). Aucune photographie
 * institutionnelle réelle n'étant encore disponible en Phase 0 (§14.3 — ne pas
 * fabriquer de contenu comme s'il était officiel), les fonds sont des dégradés de
 * charte texturés plutôt que des photos génériques (§16 — pas de banque d'images
 * clinquante). Le composant `CarrouselMedia` accepte aussi `type: 'video'`
 * (MP4/WebM + poster) : à brancher sur la médiathèque (MinIO) au Bloc B.
 */
const diapositivesActualite: Diapositive[] = [
  {
    id: 'irap-saint-louis',
    survol: 'Visite officielle',
    titre: "Visite de l'IRAP Saint-Louis-Louga par le Directeur Général",
    date: '2026-06-18',
    href: '/actualite',
    fond: { type: 'degrade', de: '#0B6E4F', a: '#123524', alt: 'Visite officielle en région' },
  },
  {
    id: 'formation-rdc',
    survol: 'Coopération',
    titre: 'Formation de cadres pénitentiaires de la RDC',
    date: '2026-05-30',
    href: '/actualite',
    fond: { type: 'degrade', de: '#123524', a: '#C9A227', alt: 'Formation de cadres' },
  },
  {
    id: 'gouverneur-dakar',
    survol: 'Visite officielle',
    titre: 'Visite du Gouverneur de Dakar, Al Hassan Sall',
    date: '2026-05-12',
    href: '/actualite',
    fond: { type: 'degrade', de: '#0B6E4F', a: '#0B5FA5', alt: 'Visite du Gouverneur de Dakar' },
  },
]

const demarches = [
  {
    numero: '01',
    icone: CalendarCheck,
    titre: 'Demander une visite',
    description: 'Déposez une demande de permis de visite en ligne et suivez son instruction.',
    href: `${URL_DEMARCHES}/visites/nouvelle`,
  },
  {
    numero: '02',
    icone: GraduationCap,
    titre: "S'inscrire à un concours",
    description: 'Consultez les avis de concours et déposez votre candidature.',
    href: `${URL_DEMARCHES}/concours`,
  },
  {
    numero: '03',
    icone: Mail,
    titre: 'Nous contacter',
    description: 'Un formulaire tracé, un accusé de réception, un numéro de ticket.',
    href: '/contact',
  },
  {
    numero: '04',
    icone: MapPin,
    titre: 'Trouver un établissement',
    description: "Annuaire des établissements pénitentiaires avec carte et horaires de visite.",
    href: '/annuaire',
  },
]

const actualites = [
  { date: '2026-06-18', titre: "Visite de l'IRAP Saint-Louis-Louga par le Directeur Général" },
  { date: '2026-05-30', titre: 'Formation de cadres pénitentiaires de la RDC' },
  { date: '2026-05-12', titre: 'Visite du Gouverneur de Dakar, Al Hassan Sall' },
  { date: '2026-04-28', titre: "Visite du DAP à Koutal" },
  { date: '2026-04-02', titre: "Visite du DAP au CPFI" },
]

const communiques = [
  { date: '2026-06-20', titre: 'Ouverture des inscriptions au concours direct — Inspecteurs' },
  { date: '2026-06-05', titre: 'Communiqué relatif aux horaires de visite pendant la période estivale' },
  { date: '2026-05-15', titre: 'Publication des résultats du concours Agents administratifs' },
]

const irap = [
  { region: 'Dakar', responsable: 'Serigne THIAO' },
  { region: 'Thiès-Diourbel', responsable: 'Mandiaye NDIAYE' },
  { region: 'Ziguinchor-Kolda-Sédhiou', responsable: 'Cheikh Tidiane SECK' },
  { region: 'Kaolack-Fatick-Kaffrine', responsable: 'Omar DIOP' },
  { region: 'Tambacounda-Matam', responsable: 'Ibrahima SAMB' },
  { region: 'Saint-Louis-Louga', responsable: 'Alioune Badara GUISSE' },
]

export function Accueil() {
  return (
    <>
      <Helmet>
        <title>Accueil — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Portail officiel de la Direction Générale de l'Administration Pénitentiaire (DGAP) du Sénégal : démarches, actualités, établissements, réinsertion."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'GovernmentOrganization',
            name: "Direction Générale de l'Administration Pénitentiaire",
            alternateName: 'DGAP',
            url: 'https://www.administrationpenitentiaire.sn',
            parentOrganization: {
              '@type': 'GovernmentOrganization',
              name: 'Ministère de la Justice du Sénégal',
              url: 'https://justice.sec.gouv.sn',
            },
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Liberté 6 Extension, Immeuble Ferdinand Coly',
              addressLocality: 'Dakar',
              addressCountry: 'SN',
            },
            telephone: '+221338694780',
            email: 'contact@administrationpenitentiaire.sn',
          })}
        </script>
      </Helmet>

      <CarrouselMedia diapositives={diapositivesActualite} label="Actualité en images" />

      <section className="relative overflow-hidden bg-surface-tint dark:bg-surface-dark-alt">
        {/* Halos décoratifs sobres — couleurs de charte, opacité faible, purement esthétiques */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-accent-soft/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-conteneur px-6 py-16 sm:py-20">
          <motion.div {...propsApparition()}>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-white/70 px-3.5 py-1.5 font-corps text-xs font-bold uppercase tracking-wide text-primary dark:border-accent-soft/30 dark:bg-white/5 dark:text-accent-soft">
              République du Sénégal — Ministère de la Justice
            </span>
            <h1 className="mt-5 max-w-3xl font-titre text-4xl font-bold leading-[1.1] text-text-strong sm:text-5xl dark:text-text-inv-strong lg:text-6xl">
              Direction Générale de l'
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Administration Pénitentiaire
              </span>
            </h1>
            <p className="mt-4 max-w-xl font-corps text-xl text-text-muted dark:text-text-inv-muted">
              Justice — Honneur — Dignité.
            </p>
          </motion.div>

          <div className="mt-10">
            <Carrousel label="Vos démarches">
              {demarches.map((d, i) => (
                <motion.div
                  key={d.titre}
                  className="w-72 shrink-0 snap-start sm:w-80"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CarteAction {...d} />
                </motion.div>
              ))}
            </Carrousel>
          </div>
        </div>
      </section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Actualité</h2>
          <a
            href="/actualite"
            className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline"
          >
            Toutes les actualités
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="mt-6">
          <Carrousel label="Actualités récentes">
            {actualites.map((a) => (
              <motion.article
                key={a.titre}
                className="w-72 shrink-0 snap-start overflow-hidden rounded-carte border border-border bg-white shadow-legere dark:border-border-dark dark:bg-surface-dark-alt
                           transition-shadow duration-200 ease-dgap hover:shadow-portee"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="h-1.5 bg-gradient-to-r from-primary to-accent" aria-hidden="true" />
                <div className="p-5">
                  <time dateTime={a.date} className="font-corps text-xs font-medium text-text-muted dark:text-text-inv-muted">
                    {new Date(a.date).toLocaleDateString('fr-SN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                  <p className="mt-2 font-corps text-sm font-medium leading-snug text-text-body dark:text-text-inv-body">{a.titre}</p>
                </div>
              </motion.article>
            ))}
          </Carrousel>
        </div>
      </motion.section>

      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-20 sm:px-8">
          <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Mot du Directeur Général</h2>
          <blockquote className="mt-6 max-w-3xl font-corps text-lg italic leading-relaxed text-text-body dark:text-text-inv-body">
            « La question de la réinsertion sociale des détenus a toujours été notre principale
            préoccupation. Tout le corps de l'Administration Pénitentiaire est dans une dynamique
            perpétuelle de travail et de rigueur, dans le but de mettre en place les meilleures
            dispositions pour améliorer les conditions de détention et préparer les détenus à une
            meilleure réinsertion sociale. »
          </blockquote>
          <p className="mt-4 font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
            Inspecteur Aliou CISS, Directeur Général de l'Administration Pénitentiaire
          </p>
        </div>
      </motion.section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Chiffres clés</h2>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Valeurs de démonstration — à paramétrer et valider par la DGAP avant mise en production.
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-4">
          <CompteurAnime valeur={0} libelle="Dossiers traités" provisoire />
          <CompteurAnime valeur={0} libelle="Établissements pénitentiaires" provisoire />
          <CompteurAnime valeur={0} suffixe="%" libelle="Objectifs atteints" provisoire />
          <CompteurAnime valeur={0} libelle="Projets réalisés" provisoire />
        </div>
      </motion.section>

      {/* Agenda & communiqués (EF-101) */}
      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-20 sm:px-8">
          <div className="flex items-center gap-2">
            <Megaphone size={20} strokeWidth={1.75} className="text-primary" aria-hidden="true" />
            <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Agenda &amp; communiqués</h2>
          </div>
          <ul className="mt-6 divide-y divide-border dark:divide-border-dark rounded-carte border border-border bg-white shadow-legere dark:border-border-dark dark:bg-surface-dark-alt dark:border-border-dark dark:bg-surface-dark-alt">
            {communiques.map((c) => (
              <li key={c.titre} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:gap-6">
                <time
                  dateTime={c.date}
                  className="shrink-0 font-corps text-xs font-semibold uppercase tracking-wide text-primary sm:w-40"
                >
                  {new Date(c.date).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
                <p className="font-corps text-sm text-text-body dark:text-text-inv-body">{c.titre}</p>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Réseau d'établissements — aperçu, renvoie vers l'annuaire complet + carte (EF-101) */}
      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} strokeWidth={1.75} className="text-primary" aria-hidden="true" />
            <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Notre réseau</h2>
          </div>
          <a
            href="/annuaire"
            className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline"
          >
            Voir l'annuaire et la carte
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Six directions régionales (IRAP) couvrent l'ensemble du territoire national.
        </p>

        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {irap.map((r) => (
            <motion.div
              key={r.region}
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              className="rounded-carte border border-border bg-white p-5 shadow-legere transition-shadow duration-200 ease-dgap hover:shadow-portee dark:border-border-dark dark:bg-surface-dark-alt"
            >
              <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">IRAP {r.region}</p>
              <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">Directeur régional : {r.responsable}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </>
  )
}
