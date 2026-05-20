module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NativeWind v2 — must come before reanimated
      'nativewind/babel',
      // React Native Reanimated — must always be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
