import type { Preview } from '@storybook/react'
import '../src/styles/global.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface-tint',
      values: [
        { name: 'surface-tint', value: '#F2F7F4' },
        { name: 'blanc', value: '#FFFFFF' },
        { name: 'vert-sombre', value: '#123524' },
      ],
    },
    a11y: { test: 'error' },
  },
}

export default preview
