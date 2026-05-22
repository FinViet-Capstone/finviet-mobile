// jest.setup.js -- runs before every test file.

// Silence the "expo-modules-core" reanimated warning under Jest.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
