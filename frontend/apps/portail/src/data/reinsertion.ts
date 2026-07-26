import type { LucideIcon } from 'lucide-react'
import {
  Hammer,
  Wrench,
  Car,
  Armchair,
  Palette,
  Wheat,
  CupSoda,
  Shirt,
  Scissors,
  Sparkles,
  Croissant,
  Sprout,
  Beef,
} from 'lucide-react'

export interface CategorieReinsertion {
  slug: string
  titre: string
  icone: LucideIcon
  description: string
}

/**
 * Ateliers de travail proposés aux personnes détenues dans le cadre de la
 * réinsertion sociale (§1.3, §7.2 du cahier des charges). Aucune photographie
 * institutionnelle réelle disponible en Phase 0 : les vignettes de la galerie sont
 * des dégradés de charte, à remplacer par les visuels officiels au Bloc B
 * (médiathèque / MinIO).
 */
export const categoriesReinsertion: CategorieReinsertion[] = [
  {
    slug: 'menuiserie',
    titre: 'Menuiserie (bois & métallique)',
    icone: Hammer,
    description:
      "Fabrication de mobilier et d'ouvrages en bois et en métal, dans des ateliers encadrés par des formateurs.",
  },
  {
    slug: 'mecanique',
    titre: 'Mécanique et garage-dépannage',
    icone: Wrench,
    description: "Entretien et réparation de véhicules, initiation aux métiers de la mécanique automobile.",
  },
  {
    slug: 'lavage-auto',
    titre: 'Lavage automobile',
    icone: Car,
    description: 'Prestations de lavage et d’entretien de véhicules, apprentissage du service client.',
  },
  {
    slug: 'tapisserie',
    titre: 'Tapisserie',
    icone: Armchair,
    description: 'Restauration et garnissage de sièges et de mobilier textile.',
  },
  {
    slug: 'art-decoration',
    titre: 'Art & décoration',
    icone: Palette,
    description: "Peinture, sculpture et objets décoratifs réalisés par les personnes détenues.",
  },
  {
    slug: 'transformation-cereales',
    titre: 'Transformation de céréales',
    icone: Wheat,
    description: 'Mouture et transformation de céréales locales en produits alimentaires.',
  },
  {
    slug: 'jus-locaux',
    titre: 'Jus locaux',
    icone: CupSoda,
    description: 'Production de jus et boissons à partir de fruits locaux (bissap, gingembre, tamarin…).',
  },
  {
    slug: 'couture',
    titre: 'Couture',
    icone: Shirt,
    description: "Confection de vêtements traditionnels et modernes dans les ateliers de couture.",
  },
  {
    slug: 'coiffure',
    titre: 'Coiffure',
    icone: Scissors,
    description: 'Formation aux techniques de coiffure et de soins capillaires.',
  },
  {
    slug: 'broderie-tricotage',
    titre: 'Broderie & tricotage',
    icone: Sparkles,
    description: "Travaux d'aiguille : broderie traditionnelle et tricotage.",
  },
  {
    slug: 'boulangerie-patisserie',
    titre: 'Boulangerie-pâtisserie',
    icone: Croissant,
    description: 'Fabrication de pain et de pâtisseries dans les fournils des établissements.',
  },
  {
    slug: 'agriculture',
    titre: 'Agriculture',
    icone: Sprout,
    description: 'Cultures maraîchères et céréalières dans les camps pénaux disposant de terres agricoles.',
  },
  {
    slug: 'elevage',
    titre: 'Élevage',
    icone: Beef,
    description: 'Élevage de volailles et de petits ruminants, en appui à l’autosuffisance alimentaire.',
  },
]

export function trouverCategorie(slug: string | undefined): CategorieReinsertion | undefined {
  return categoriesReinsertion.find((c) => c.slug === slug)
}
