// ESLint flat config (ESLint v9). Expo's shared config bundles the
// React, React Hooks, React Native and TypeScript rules appropriate for this
// project. Keep overrides pragmatic — the goal is a clean `npm run lint`, not
// maximal strictness.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'expo-env.d.ts',
    ],
  },
  {
    // The React Compiler is NOT enabled in this project (babel.config.js only
    // runs the Reanimated plugin). The compiler-readiness diagnostics from
    // eslint-plugin-react-hooks v6 therefore flag intentional, runtime-safe
    // idioms (e.g. `useRef(new Animated.Value(x)).current`, syncing state from
    // props in an effect). Keep them as advisory warnings rather than errors.
    // `rules-of-hooks` and `exhaustive-deps` stay at their defaults.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // Jest setup + test files: provide the test/runtime globals.
    files: ['jest.setup.js', '**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        global: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },
];
