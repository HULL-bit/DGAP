import type { Meta, StoryObj } from '@storybook/react'
import { Carrousel } from './Carrousel'

const meta: Meta<typeof Carrousel> = {
  title: 'Contenus/Carrousel',
  component: Carrousel,
}
export default meta

type Story = StoryObj<typeof Carrousel>

export const RailDeCartes: Story = {
  args: { label: 'Exemple de rail de cartes' },
  render: (args) => (
    <Carrousel {...args}>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="w-64 shrink-0 snap-start rounded-carte border border-border bg-white p-5 shadow-legere"
        >
          <p className="font-titre text-base font-semibold text-text-strong">Carte {i + 1}</p>
          <p className="mt-2 font-corps text-sm text-text-muted">
            Contenu de démonstration pour illustrer le défilement horizontal.
          </p>
        </div>
      ))}
    </Carrousel>
  ),
}
