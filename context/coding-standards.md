You are an expert in TypeScript, React Native, Expo, and Mobile UI development.

  Code Style and Structure
  - Write concise, technical TypeScript code with accurate examples.
  - Use functional and declarative programming patterns; avoid classes.
  - Prefer iteration and modularization over code duplication.
  - Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
  - Structure files: exported component, subcomponents, helpers, static content, types.
  - Follow Expo's official documentation for setting up and configuring your projects: https://docs.expo.dev/

  Naming Conventions
  - Use lowercase with dashes for directories (e.g., components/auth-wizard).
  - Favor named exports for components.

  TypeScript Usage
  - Use TypeScript for all code; prefer interfaces over types.
  - Avoid enums; use maps instead.
  - Use functional components with TypeScript interfaces.
  - Use strict mode in TypeScript for better type safety.

  Syntax and Formatting
  - Use the "function" keyword for pure functions.
  - Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
  - Use declarative JSX.
  - Rely on ESLint (eslint-config-expo) for code style enforcement; this project does not use Prettier.

  UI and Styling
  - Use Expo's built-in components for common UI patterns and layouts.
  - Implement responsive design with Flexbox and Expo's useWindowDimensions for screen size adjustments.
  - Use plain React Native `StyleSheet` with centralized design tokens (`src/constants/theme.ts`) for component styling — not styled-components or Tailwind.
  - Implement dark/light mode support via `useThemeColors()` (`src/providers/ThemeProvider.tsx`), which resolves `DARK_COLORS`/`LIGHT_COLORS` from `src/constants/theme.ts` based on user preference + `useColorScheme`. Prefer it over importing the theme-invariant `COLORS` export directly in new code.
  - Ensure high accessibility (a11y) standards using ARIA roles and native accessibility props.
  - Leverage react-native-reanimated and react-native-gesture-handler for performant animations and gestures.

  Safe Area Management
  - Use SafeAreaProvider from react-native-safe-area-context to manage safe areas globally in your app.
  - Wrap top-level components with SafeAreaView to handle notches, status bars, and other screen insets on both iOS and Android.
  - Use SafeAreaScrollView for scrollable content to ensure it respects safe area boundaries.
  - Avoid hardcoding padding or margins for safe areas; rely on SafeAreaView and context hooks.

  Performance Optimization
  - Minimize the use of useState and useEffect; prefer context and reducers for state management.
  - Use expo-splash-screen for optimized app startup experience (AppLoading was removed in SDK 44).
  - Optimize images: use WebP format where supported, include size data, implement lazy loading with expo-image.
  - Rely on Expo Router's automatic route-based code loading; `React.lazy`/`Suspense` do not reduce startup cost the same way in RN's single-bundle model.
  - Profile and monitor performance using React Native's built-in tools and Expo's debugging features.
  - Avoid unnecessary re-renders by memoizing components and using useMemo and useCallback hooks appropriately.

  Navigation
  - Use Expo Router (file-based, built on react-navigation) for routing and navigation.
  - Leverage deep linking and universal links for better user engagement and navigation flow.
  - Use dynamic routes with expo-router for better navigation handling.

  State Management
  - Use Zustand for global UI/session state (see `src/stores/`); reserve React Context for cross-cutting concerns like theming. Avoid `useReducer` unless a store's local logic genuinely needs it.
  - Leverage react-query for data fetching and caching; avoid excessive API calls.
  - Handle URL search parameters using libraries like expo-linking.

  Error Handling and Validation
  - Use Zod for runtime validation and error handling.
  - Implement proper error logging using Sentry or a similar service.
  - Prioritize error handling and edge cases:
    - Handle errors at the beginning of functions.
    - Use early returns for error conditions to avoid deeply nested if statements.
    - Avoid unnecessary else statements; use if-return pattern instead.
    - Implement global error boundaries to catch and handle unexpected errors.
  - Use expo-error-reporter for logging and reporting errors in production.

  Testing
  - Write unit tests using Jest and React Native Testing Library.
  - Implement integration tests for critical user flows using Detox.
  - Use Expo's testing tools for running tests in different environments.
  - Consider snapshot testing for components to ensure UI consistency.

  Security
  - Sanitize user inputs to prevent XSS attacks.
  - Use expo-secure-store for secure storage of sensitive data (iOS Keychain / Android EncryptedSharedPreferences).
  - Ensure secure communication with APIs using HTTPS and proper authentication.
  - Use Expo's Security guidelines to protect your app: https://docs.expo.dev/guides/security/

  Internationalization (i18n)
  - This app is Vietnamese-only; do not add an i18n library. Extract Vietnamese UI strings to named constants in `src/data/` or `src/constants/` rather than inlining them in JSX.
  - Ensure text scaling and font adjustments for accessibility.

  Key Conventions
  1. Rely on Expo's managed workflow for streamlined development and deployment.
  2. Prioritize native performance metrics (cold-start time, JS-thread frame rate/jank, list scroll FPS) — there is no web target.
  3. Use `EXPO_PUBLIC_*` build-time environment variables (see `src/lib/env.ts`) for configuration; reserve expo-constants for native manifest fields.
  4. Use per-module permission APIs (e.g. expo-image-picker, expo-notifications) to handle device permissions gracefully — expo-permissions was removed in SDK 46.
  5. Implement expo-updates for over-the-air (OTA) updates.
  6. Follow Expo's best practices for app deployment and publishing: https://docs.expo.dev/distribution/introduction/
  7. Ensure compatibility with iOS and Android by testing extensively on both platforms.

  API Documentation
  - Use Expo's official documentation for setting up and configuring your projects: https://docs.expo.dev/

  Refer to Expo's documentation for detailed information on Views, Blueprints, and Extensions for best practices.