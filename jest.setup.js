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
