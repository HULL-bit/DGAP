import { Carte, Badge } from '@dgap/ui'

/** Accueil back-office — socle Phase 0. CMS complet (workflow, médias, versions) livré au Bloc C. */
export function Accueil() {
  return (
    <section className="mx-auto max-w-conteneur px-6 py-16">
      <h1 className="font-titre text-3xl font-bold text-text-strong">Back-office DGAP</h1>
      <p className="mt-2 font-corps text-text-muted">Administration éditoriale et instruction des dossiers.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Carte>
          <h2 className="font-titre text-sm font-semibold text-text-strong">Contenus éditoriaux</h2>
          <Badge ton="neutre" libelle="CMS — à venir (Bloc C)" />
        </Carte>
        <Carte>
          <h2 className="font-titre text-sm font-semibold text-text-strong">Visites en instruction</h2>
          <Badge ton="neutre" libelle="Bloc D" />
        </Carte>
        <Carte>
          <h2 className="font-titre text-sm font-semibold text-text-strong">Tableaux statistiques</h2>
          <Badge ton="neutre" libelle="Bloc F" />
        </Carte>
      </div>
    </section>
  )
}
