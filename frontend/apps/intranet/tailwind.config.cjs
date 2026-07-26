module.exports = {
  presets: [require('@dgap/config/tailwind-preset')],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
}
