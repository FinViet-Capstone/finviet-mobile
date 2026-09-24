// jest.setup.js -- runs before every test file.

// Reanimated 4's bundled mock imports the native worklets initializer under
// Expo 57. This small JS-only surface covers the primitives used by FinViet.
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  const immediate = (value) => value;
  return {
    __esModule: true,
    default: {
      ...ReactNative.Animated,
      View: ReactNative.View,
      Text: ReactNative.Text,
      Image: ReactNative.Image,
      ScrollView: ReactNative.ScrollView,
      createAnimatedComponent: (component) => component,
      call: () => {},
    },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (updater) => updater(),
    withTiming: immediate,
    withSpring: immediate,
    runOnJS: (fn) => fn,
  };
});

// Google Sign-In is a native module with no JS fallback — importing it
// unmocked fails outside a dev build. Mocked globally so any suite that
// reaches the auth service can import it; suites that exercise the flow
// drive these fns directly (see src/lib/__tests__/googleAuth.test.ts).
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
  statusCodes: Object.freeze({
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    NULL_PRESENTER: 'NULL_PRESENTER',
  }),
  isErrorWithCode: (error) => typeof error?.code === 'string',
  isSuccessResponse: (response) => response?.type === 'success',
}));

// Answers "is the Google native module in this binary?" — always false under
// Jest, which has no native registry. Forced true so suites exercise the real
// flow; the unavailable branch is driven explicitly where it is tested.
jest.mock('@/lib/nativeModuleAvailability', () => ({
  isGoogleSignInAvailable: jest.fn(() => true),
}));

// The Sentry SDK ships untransformed ESM and would report to the real project
// (SENTRY_DSN has a default). Any suite reaching the auth store pulls it in via
// the query client, so it is stubbed globally.
jest.mock('@/lib/sentry', () => ({
  initSentry: jest.fn(),
  captureException: jest.fn(),
}));
