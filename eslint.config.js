import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Firebase & Gemini give us loosely-typed SDK objects; allow explicit any
      // where we know the shape at runtime.
      '@typescript-eslint/no-explicit-any': 'warn',

      // We use empty catch blocks for silent-fail behaviour in offline mode.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Console is fine for a small SME app; keep it as a warning, not an error.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Allow unused args prefixed with _ (common for event handlers / unused props)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
])