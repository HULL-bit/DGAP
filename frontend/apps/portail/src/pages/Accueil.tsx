import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  GraduationCap,
  Mail,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Megaphone,
  Building2,
  Newspaper,
  HeartHandshake,
  FileText,
  Download,
  Package,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  CarteAction,
  CompteurAnime,
  CarrouselMedia,
  type Diapositive,
  propsApparition,
  conteneurEnCascade,
  elementEnCascade,
} from '@dgap/ui'
import { requeteApi } from '@dgap/api-client'
import { URL_DEMARCHES } from '../config'
import { categoriesReinsertion } from '../data/reinsertion'
import photoDirecteurGeneral from '../assets/directeur-general.png'
import type {
  ArticleListe,
  DocumentOfficiel,
  Galerie,
  GalerieResume,
  Pagination,
  ProduitBoutique,
} from '../types/api'
import { LIBELLES_NATURE_DOCUMENT } from '../types/api'

/**
 * Diapositives de repli tant qu'aucune image n'a été téléversée dans la galerie
 * `accueil-carrousel` (back-office → Galeries). Dès qu'un rédacteur y ajoute des
 * images, `Accueil` les utilise à la place de ces dégradés de charte (§14.3 — ne
 * jamais présenter un dégradé comme une photographie officielle).
 */
const diapositivesReplis: Diapositive[] = [
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

const communiques = [
  { date: '2026-06-20', titre: 'Ouverture des inscriptions au concours direct — Inspecteurs' },
  { date: '2026-06-05', titre: 'Communiqué relatif aux horaires de visite pendant la période estivale' },
  { date: '2026-05-15', titre: 'Publication des résultats du concours Agents administratifs' },
]

// Photo du Directeur Général — photographie officielle réelle (§14.3 : jamais de
// photo générique/de banque d'images présentée comme officielle).
const PHOTO_DIRECTEUR_GENERAL = photoDirecteurGeneral
const PROFIL_DIRECTEUR_GENERAL = ''

const irap = [
  { region: 'Dakar', responsable: 'Serigne THIAO' },
  { region: 'Thiès-Diourbel', responsable: 'Mandiaye NDIAYE' },
  { region: 'Ziguinchor-Kolda-Sédhiou', responsable: 'Cheikh Tidiane SECK' },
  { region: 'Kaolack-Fatick-Kaffrine', responsable: 'Omar DIOP' },
  { region: 'Tambacounda-Matam', responsable: 'Ibrahima SAMB' },
  { region: 'Saint-Louis-Louga', responsable: 'Alioune Badara GUISSE' },
]

/** Sous-ensemble représentatif des treize ateliers — la liste complète vit sur /reinsertion. */
const categoriesAccueil = categoriesReinsertion.filter((c) =>
  ['menuiserie', 'couture', 'agriculture', 'jus-locaux', 'boulangerie-patisserie', 'coiffure'].includes(c.slug),
)

const degradesReinsertion = [
  ['#0B6E4F', '#123524'],
  ['#123524', '#C9A227'],
  ['#0B6E4F', '#0B5FA5'],
  ['#095C42', '#1B7F3B'],
  ['#C9A227', '#123524'],
  ['#0B5FA5', '#123524'],
]

function EnTeteSection({
  icone: Icone,
  titre,
}: {
  icone: typeof Megaphone
  titre: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-white/10 dark:text-accent-soft">
        <Icone size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">{titre}</h2>
    </div>
  )
}

export function Accueil() {
  const { data: galerieCarrousel } = useQuery({
    queryKey: ['galerie', 'accueil-carrousel'],
    queryFn: () => requeteApi<Galerie>('/galeries/accueil-carrousel'),
    retry: false,
  })

  const { data: articles } = useQuery({
    queryKey: ['articles', 'accueil'],
    queryFn: () => requeteApi<Pagination<ArticleListe>>('/articles?limit=3'),
    retry: false,
  })

  const { data: galeriesReinsertion } = useQuery({
    queryKey: ['galeries', 'reinsertion-'],
    queryFn: () => requeteApi<GalerieResume[]>('/galeries?prefixe=reinsertion-'),
    retry: false,
  })

  const { data: documents } = useQuery({
    queryKey: ['documents', 'accueil'],
    queryFn: () => requeteApi<Pagination<DocumentOfficiel>>('/documents?limit=4'),
    retry: false,
  })

  const { data: produitsBoutique } = useQuery({
    queryKey: ['boutique', 'accueil'],
    queryFn: () => requeteApi<Pagination<ProduitBoutique>>('/boutique/produits?limit=3'),
    retry: false,
  })

  function couvertureDe(slug: string): string {
    return galeriesReinsertion?.find((g) => g.code === `reinsertion-${slug}`)?.couverture ?? ''
  }

  const imagesGalerie = galerieCarrousel?.medias.filter((m) => m.type === 'IMAGE' && m.image) ?? []
  const diapositives: Diapositive[] =
    imagesGalerie.length > 0
      ? imagesGalerie.map((media) => ({
          id: media.id,
          survol: 'Actualité en images',
          titre: media.legende || galerieCarrousel!.titre,
          href: '/actualite',
          fond: { type: 'image', src: media.image!, alt: media.legende || galerieCarrousel!.titre },
        }))
      : diapositivesReplis

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

      <CarrouselMedia diapositives={diapositives} label="Actualité en images" />

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

        <div className="relative mx-auto max-w-conteneur px-6 py-24 sm:py-28">
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

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {demarches.map((d, i) => (
              <motion.div
                key={d.titre}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <CarteAction {...d} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28" {...propsApparition()}>
        <div className="flex items-end justify-between gap-4">
          <EnTeteSection icone={Newspaper} titre="Actualité" />
          <Link
            to="/actualite"
            className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
          >
            Toutes les actualités
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <motion.div
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={conteneurEnCascade()}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {(articles?.results ?? []).map((article) => (
            <motion.article
              key={article.id}
              variants={elementEnCascade}
              className="group overflow-hidden rounded-carte border border-border bg-white shadow-legere dark:border-border-dark dark:bg-surface-dark-alt
                         transition-shadow duration-200 ease-dgap hover:shadow-portee"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to={`/actualite/${article.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary to-primary-dark">
                  {article.image_url ? (
                    <img
                      src={article.image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 ease-dgap group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Newspaper size={40} strokeWidth={1.5} aria-hidden="true" className="text-white/70" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  {article.date_publication && (
                    <time
                      dateTime={article.date_publication}
                      className="font-corps text-xs font-semibold uppercase tracking-wide text-primary dark:text-accent-soft"
                    >
                      {new Date(article.date_publication).toLocaleDateString('fr-SN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  )}
                  <p className="mt-2 font-titre text-lg font-semibold leading-snug text-text-strong dark:text-text-inv-strong">
                    {article.titre}
                  </p>
                  {article.chapo && (
                    <p className="mt-2 line-clamp-2 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                      {article.chapo}
                    </p>
                  )}
                </div>
              </Link>
            </motion.article>
          ))}

          {articles && articles.results.length === 0 && (
            <p className="col-span-full font-corps text-sm text-text-muted dark:text-text-inv-muted">
              Aucune actualité publiée pour le moment.
            </p>
          )}
        </motion.div>
      </motion.section>

      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28">
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div className="md:max-w-3xl">
              <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">
                Mot du Directeur Général
              </h2>
              <blockquote className="mt-6 font-corps text-lg italic leading-relaxed text-text-body dark:text-text-inv-body">
                « La question de la réinsertion sociale des détenus a toujours été notre principale
                préoccupation. Tout le corps de l'Administration Pénitentiaire est dans une dynamique
                perpétuelle de travail et de rigueur, dans le but de mettre en place les meilleures
                dispositions pour améliorer les conditions de détention et préparer les détenus à une
                meilleure réinsertion sociale. »
              </blockquote>
              <p className="mt-4 font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                Inspecteur Aliou CISS, Directeur Général de l'Administration Pénitentiaire
              </p>
              {PROFIL_DIRECTEUR_GENERAL && (
                <p className="mt-3 max-w-2xl font-corps text-sm leading-relaxed text-text-muted dark:text-text-inv-muted">
                  {PROFIL_DIRECTEUR_GENERAL}
                </p>
              )}
            </div>

            <div className="shrink-0 self-center md:self-auto">
              {PHOTO_DIRECTEUR_GENERAL ? (
                <img
                  src={PHOTO_DIRECTEUR_GENERAL}
                  alt=""
                  className="h-44 w-44 rounded-full object-cover shadow-portee ring-4 ring-white dark:ring-surface-dark-alt sm:h-52 sm:w-52"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-titre text-4xl font-bold text-white shadow-portee sm:h-52 sm:w-52"
                >
                  AC
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28" {...propsApparition()}>
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

      {/* La Réinsertion — aperçu par atelier, renvoie vers l'index complet (§7.2) */}
      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28">
          <div className="flex items-end justify-between gap-4">
            <EnTeteSection icone={HeartHandshake} titre="La Réinsertion" />
            <Link
              to="/reinsertion"
              className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              Voir tous les ateliers
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Ateliers de travail et de formation proposés aux personnes détenues, en vue d'une meilleure
            réinsertion sociale.
          </p>

          <motion.div
            className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={conteneurEnCascade()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {categoriesAccueil.map((categorie, i) => {
              const [de, a] = degradesReinsertion[i % degradesReinsertion.length]!
              const couverture = couvertureDe(categorie.slug)
              return (
                <motion.div key={categorie.slug} variants={elementEnCascade}>
                  <Link
                    to={`/reinsertion/${categorie.slug}`}
                    className="group block overflow-hidden rounded-carte border border-border bg-white shadow-legere dark:border-border-dark dark:bg-surface-dark-alt
                               transition-shadow duration-200 ease-dgap hover:shadow-portee
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div
                      className="relative flex h-40 items-center justify-center overflow-hidden"
                      style={couverture ? undefined : { background: `linear-gradient(135deg, ${de}, ${a})` }}
                    >
                      {couverture && (
                        <>
                          <img
                            src={couverture}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-dgap group-hover:scale-105"
                          />
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0"
                            aria-hidden="true"
                          />
                        </>
                      )}
                      <categorie.icone
                        size={36}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={
                          couverture
                            ? 'relative text-white drop-shadow-md transition-transform duration-300 ease-dgap group-hover:scale-110'
                            : 'text-white/90 transition-transform duration-300 ease-dgap group-hover:scale-110'
                        }
                      />
                    </div>
                    <div className="p-5">
                      <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                        {categorie.titre}
                      </p>
                      <p className="mt-2 line-clamp-2 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                        {categorie.description}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 font-corps text-sm font-medium text-primary dark:text-accent-soft">
                        Découvrir
                        <ArrowRight
                          size={16}
                          aria-hidden="true"
                          className="transition-transform duration-200 ease-dgap group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* Boutique — produits fabriqués par les personnes détenues, vitrine sans paiement en ligne */}
      <motion.section className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28" {...propsApparition()}>
        <div className="flex items-end justify-between gap-4">
          <EnTeteSection icone={Package} titre="Boutique" />
          <Link
            to="/boutique"
            className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
          >
            Voir la boutique
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Des produits fabriqués par les personnes détenues dans le cadre des ateliers de réinsertion.
        </p>

        <motion.div
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={conteneurEnCascade()}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {(produitsBoutique?.results ?? []).map((produit) => (
            <motion.div
              key={produit.id}
              variants={elementEnCascade}
              className="overflow-hidden rounded-carte border border-border bg-white shadow-legere transition-shadow duration-200 ease-dgap hover:shadow-portee dark:border-border-dark dark:bg-surface-dark-alt"
            >
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary-dark">
                {produit.image_url ? (
                  <img src={produit.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package size={40} strokeWidth={1.5} aria-hidden="true" className="text-white/70" />
                )}
              </div>
              <div className="p-5">
                <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                  {produit.nom}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  {produit.prix_promotionnel ? (
                    <>
                      <span className="font-titre text-lg font-bold text-primary dark:text-accent-soft">
                        {Number(produit.prix_promotionnel).toLocaleString('fr-SN')} FCFA
                      </span>
                      <span className="font-corps text-sm text-text-muted line-through dark:text-text-inv-muted">
                        {Number(produit.prix).toLocaleString('fr-SN')} FCFA
                      </span>
                    </>
                  ) : (
                    <span className="font-titre text-lg font-bold text-text-strong dark:text-text-inv-strong">
                      {Number(produit.prix).toLocaleString('fr-SN')} FCFA
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {produitsBoutique && produitsBoutique.results.length === 0 && (
            <p className="col-span-full font-corps text-sm text-text-muted dark:text-text-inv-muted">
              Aucun produit disponible pour le moment.
            </p>
          )}
        </motion.div>
      </motion.section>

      {/* Agenda & communiqués (EF-101) */}
      <motion.section className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28" {...propsApparition()}>
        <EnTeteSection icone={Megaphone} titre="Agenda &amp; communiqués" />
        <ul className="mt-8 divide-y divide-border rounded-carte border border-border bg-white shadow-legere dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt">
          {communiques.map((c) => (
            <li key={c.titre} className="flex flex-col gap-1.5 p-6 sm:flex-row sm:items-center sm:gap-8">
              <time
                dateTime={c.date}
                className="shrink-0 font-corps text-xs font-semibold uppercase tracking-wide text-primary dark:text-accent-soft sm:w-40"
              >
                {new Date(c.date).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
              <p className="font-corps text-base text-text-body dark:text-text-inv-body">{c.titre}</p>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Documents et publications officielles — textes juridiques, avis de concours, statistiques */}
      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28">
          <div className="flex items-end justify-between gap-4">
            <EnTeteSection icone={FileText} titre="Documents officiels" />
            <Link
              to="/publications"
              className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              Tous les documents
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Textes juridiques, avis de concours et publications officielles, téléchargeables librement.
          </p>

          <motion.div
            className="mt-8 grid gap-4 sm:grid-cols-2"
            variants={conteneurEnCascade()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {(documents?.results ?? []).map((document) => (
              <motion.div
                key={document.id}
                variants={elementEnCascade}
                className="flex items-center gap-4 rounded-carte border border-border bg-white p-5 shadow-legere dark:border-border-dark dark:bg-surface-dark-alt"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-white/10 dark:text-accent-soft">
                  <FileText size={22} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-corps text-xs font-semibold uppercase tracking-wide text-primary dark:text-accent-soft">
                    {LIBELLES_NATURE_DOCUMENT[document.nature]}
                  </p>
                  <p className="mt-0.5 truncate font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                    {document.titre}
                  </p>
                </div>
                {document.fichier_url && (
                  <a
                    href={document.fichier_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Télécharger : ${document.titre}`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary
                               transition-colors duration-200 ease-dgap hover:bg-primary hover:text-white
                               dark:text-accent-soft dark:hover:bg-accent-soft dark:hover:text-primary-dark
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Download size={18} aria-hidden="true" />
                  </a>
                )}
              </motion.div>
            ))}

            {documents && documents.results.length === 0 && (
              <p className="col-span-full font-corps text-sm text-text-muted dark:text-text-inv-muted">
                Aucun document publié pour le moment.
              </p>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* Réseau d'établissements — aperçu, renvoie vers l'annuaire complet + carte (EF-101) */}
      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-24 sm:px-8 sm:py-28">
          <div className="flex items-end justify-between gap-4">
            <EnTeteSection icone={Building2} titre="Notre réseau" />
            <Link
              to="/annuaire"
              className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              Voir l'annuaire et la carte
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Six directions régionales (IRAP) couvrent l'ensemble du territoire national.
          </p>

          <motion.div
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={conteneurEnCascade()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {irap.map((r) => (
              <motion.div
                key={r.region}
                variants={elementEnCascade}
                className="rounded-carte border border-border bg-white p-6 shadow-legere transition-shadow duration-200 ease-dgap hover:shadow-portee dark:border-border-dark dark:bg-surface-dark-alt"
              >
                <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">IRAP {r.region}</p>
                <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">Directeur régional : {r.responsable}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </>
  )
}
