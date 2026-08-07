import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { CarteDirecteur, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'

const directeursCentraux = [
  {
    nom: 'Mbaye SARR',
    fonction: "Directeur de l'ENAP",
    email: 'mbaye.sarr@administrationpenitentiaire.sn',
    telephone: '(+221) 33 827 15 19',
  },
  {
    nom: 'Samba DIOUF',
    fonction:
      'Directeur des affaires juridiques, de la planification, des statistiques et des établissements pénitentiaires',
    email: 'samba.diouf@administrationpenitentiaire.sn',
    telephone: '(+221) 33 827 15 19',
  },
  {
    nom: 'Souleymane FAYE',
    fonction: 'Inspecteur Interne des Services pénitentiaires',
    email: 'souleymane.faye@administrationpenitentiaire.sn',
    telephone: '(+221) 33 827 15 19',
  },
]

const directeursRegionaux = [
  {
    nom: 'Serigne THIAO',
    fonction: 'Directeur Régional de Dakar',
    email: 'serigne.thiao@administrationpenitentiaire.sn',
    telephone: '(+221) 33 827 15 19',
  },
  {
    nom: 'Mandiaye NDIAYE',
    fonction: 'Directeur Régional de Thiès-Diourbel',
    email: 'mandiaye.ndiaye@administrationpenitentiaire.sn',
    telephone: '(+221) 33 991 10 64',
  },
  {
    nom: 'Cheikh Tidiane SECK',
    fonction: 'Directeur Régional de Ziguinchor–Kolda–Sédhiou',
    email: 'cheikht.seck@administrationpenitentiaire.sn',
    telephone: '(+221) 33 951 11 10',
  },
  {
    nom: 'Omar DIOP',
    fonction: 'Directeur Régional de Kaolack–Fatick–Kaffrine',
    email: 'omar.diop@administrationpenitentiaire.sn',
    telephone: '(+221) 33 941 27 79',
  },
  {
    nom: 'Ibrahima SAMB',
    fonction: 'Directeur Régional de Tambacounda-Matam',
    email: 'ibrahima.samb@administrationpenitentiaire.sn',
    telephone: '(+221) 33 981 10 89',
  },
  {
    nom: 'Alioune Badara GUISSE',
    fonction: 'Directeur Régional de Saint-Louis-Louga',
    email: 'aliouneb.guisse@administrationpenitentiaire.sn',
    telephone: '(+221) 33 961 10 26',
  },
]

export function APropos() {
  return (
    <>
      <Helmet>
        <title>À propos — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Organisation de la Direction Générale de l'Administration Pénitentiaire du Sénégal : directeurs centraux et régionaux (IRAP)."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">À propos</h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              La Direction Générale de l'Administration Pénitentiaire pilote l'ensemble des
              établissements pénitentiaires du Sénégal, sous la tutelle du Ministère de la Justice.
            </p>
          </motion.div>
        </div>
      </section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Les Directeurs Centraux de la DGAP</h2>
        <p className="mt-2 max-w-2xl font-corps text-text-muted dark:text-text-inv-muted">
          Le DGAP a toute la capacité et l'expertise de la gestion de détention et du milieu carcéral.
        </p>
        <motion.div
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={conteneurEnCascade()}
          initial="hidden"
          animate="visible"
        >
          {directeursCentraux.map((d) => (
            <motion.div key={d.nom} variants={elementEnCascade}>
              <CarteDirecteur {...d} />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section className="bg-surface-tint dark:bg-surface-dark-alt" {...propsApparition()}>
        <div className="mx-auto max-w-conteneur px-6 py-20 sm:px-8">
          <h2 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong">Les Directeurs Régionaux de la DGAP</h2>
          <p className="mt-2 max-w-2xl font-corps text-text-muted dark:text-text-inv-muted">
            Six directions régionales (IRAP) couvrent l'ensemble du territoire national.
          </p>
          <motion.div
            className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={conteneurEnCascade()}
            initial="hidden"
            animate="visible"
          >
            {directeursRegionaux.map((d) => (
              <motion.div key={d.nom} variants={elementEnCascade}>
                <CarteDirecteur {...d} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </>
  )
}
