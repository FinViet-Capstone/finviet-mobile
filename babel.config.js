module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated — must always be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
