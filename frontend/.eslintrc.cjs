module.exports = {
  root: true,
  extends: [require.resolve('@dgap/config/eslint-preset.js')],
  ignorePatterns: ['dist', 'node_modules', 'storybook-static', '**/*.stories.tsx'],
}
