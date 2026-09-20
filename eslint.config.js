import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.wrangler/**', // wrangler build artefacts
      'dev-dist/**',
      'test-results/**',
      'playwright-report/**',
      'docs/constitution/**', // vendored — see CLAUDE.md
      'RSS reader design/**', // reference design, kept as delivered
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // App source
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: { 'react-refresh': reactRefresh },
    extends: [reactHooks.configs.flat['recommended-latest']],
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Worker and Node-side config
  {
    files: ['relay/**/*.ts', '*.config.ts', 'vitest.setup.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Tests
  {
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts', 'src/test/**/*.ts', 'vitest.setup.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Must stay last: turns off every rule that fights the formatter.
  prettier,
);
