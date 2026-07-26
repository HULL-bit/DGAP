import { Carte, Badge } from '@dgap/ui'

/**
 * Tableau de bord agent — socle Phase 0 (EF-701 livré au Bloc F). Accès réservé
 * (VPN d'État + MFA, cf. nginx/conf.d/intranet.conf) ; non indexable.
 */
export function Accueil() {
  return (
    <section className="mx-auto max-w-conteneur px-6 py-16">
      <h1 className="font-titre text-3xl font-bold text-text-strong">Tableau de bord agent</h1>
      <p className="mt-2 font-corps text-text-muted">Bienvenue. Vos éléments en attente s'afficheront ici.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Carte>
          <h2 className="font-titre text-sm font-semibold text-text-strong">Courriers affectés</h2>
          <Badge ton="neutre" libelle="Module GEC — socle" />
        </Carte>
        <Carte>
          <h2 className="font-titre text-sm font-semibold text-text-strong">Demandes de congé</h2>
          <Badge ton="neutre" libelle="Module RH — socle" />
        </Carte>
        <Carte>
          <h2 className="font-titre text-sm font-semibold text-text-strong">Notes de service</h2>
          <Badge ton="neutre" libelle="À paraître" />
        </Carte>
      </div>
    </section>
  )
}
