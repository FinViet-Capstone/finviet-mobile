/**
 * nativeModuleAvailability.ts — "is this native module in the binary?"
 *
 * Its own module for one reason: it is the only part of the Google sign-in path
 * that cannot run under Jest (there is no native registry there), so keeping it
 * isolated lets every other suite mock a single, honest boolean instead of the
 * React Native core.
 */

import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Whether `@react-native-google-signin/google-signin` can actually be loaded.
 *
 * It MUST be answered without importing that package. The package resolves its
 * TurboModule with `getEnforcing` at import time, and Metro's dev-mode
 * `guardedLoadModule` routes a throwing module factory straight to
 * `ErrorUtils.reportFatalError` — a full-screen redbox — instead of letting the
 * caller's try/catch see it. `TurboModuleRegistry.get` is the non-throwing
 * counterpart; `NativeModules` covers the old architecture's interop.
 */
export function isGoogleSignInAvailable(): boolean {
  try {
    if (TurboModuleRegistry.get('RNGoogleSignin') != null) return true;
    return NativeModules.RNGoogleSignin != null;
  } catch {
    return false;
  }
}
