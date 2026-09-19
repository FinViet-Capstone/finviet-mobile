// Android Google Sign-In is autolinked and configured with the web client ID.
// iOS additionally needs the reversed iOS client ID registered as a URL scheme.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(iosClientId ? [[
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: iosClientId.split('.').reverse().join('.') },
      ]] : []),
    ],
  };
};
