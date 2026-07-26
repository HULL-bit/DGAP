import type { Meta, StoryObj } from '@storybook/react'
import { Bouton } from './Bouton'

const meta: Meta<typeof Bouton> = {
  title: 'Fondations/Bouton',
  component: Bouton,
  args: { children: 'Demander une visite', variante: 'primaire', taille: 'md' },
  argTypes: {
    variante: { control: 'radio', options: ['primaire', 'secondaire', 'discret'] },
    taille: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
}
export default meta

type Story = StoryObj<typeof Bouton>

export const Primaire: Story = {}
export const Secondaire: Story = { args: { variante: 'secondaire' } }
export const Discret: Story = { args: { variante: 'discret' } }
export const Desactive: Story = { args: { disabled: true } }
