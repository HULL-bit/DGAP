import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Contenus/Badge de statut',
  component: Badge,
  args: { ton: 'attente', libelle: 'En instruction' },
  argTypes: {
    ton: { control: 'radio', options: ['succes', 'attente', 'erreur', 'alerte', 'neutre'] },
  },
}
export default meta

type Story = StoryObj<typeof Badge>

export const EnAttente: Story = {}
export const Valide: Story = { args: { ton: 'succes', libelle: 'Permis délivré' } }
export const Rejete: Story = { args: { ton: 'erreur', libelle: 'Dossier rejeté' } }
export const Alerte: Story = { args: { ton: 'alerte', libelle: 'Pièce manquante' } }
