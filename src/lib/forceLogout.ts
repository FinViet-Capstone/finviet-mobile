/**
 * forceLogout.ts — end the local session when the backend reports that the
 * account was locked (deactivated) by an admin.
 *
 * The backend re-checks Customer.IsActive on every authenticated request and
 * answers `403 { code: "account_deactivated" }` once the account is locked (see
 * finviet-be Program.cs JwtBearer OnTokenValidated). The Axios interceptor calls
 * `forceLogoutAccountDeactivated()` on that response; clearing the auth store
 * flips `isAuthenticated`, and `useSessionGuard` then sends the user to login.
 */

import { Alert } from 'react-native';
import { clearAuthTokens } from '@/lib/mmkv';
import { useAuthStore } from '@/stores/authStore';

/** Must match finviet-be AccountStatusCodes.AccountDeactivated. */
export const ACCOUNT_DEACTIVATED_CODE = 'account_deactivated';

const LOCKED_TITLE = 'Tài khoản đã bị khóa';
const LOCKED_MESSAGE =
  'Tài khoản của bạn đã bị quản trị viên tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.';

/** True for the backend's `403 { code: "account_deactivated" }` response. */
export function isAccountDeactivatedError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: string | null } } } | null)
    ?.response;
  return response?.status === 403 && response.data?.code === ACCOUNT_DEACTIVATED_CODE;
}

// Extra cleanup hooks (e.g. clearing the React Query cache). Registered from the
// React tree so this module — imported by api.ts — stays free of heavy imports.
type ForceLogoutListener = () => void;
const listeners = new Set<ForceLogoutListener>();

/** Run `listener` whenever a forced logout happens. Returns an unsubscribe fn. */
export function subscribeForceLogout(listener: ForceLogoutListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Several in-flight requests usually fail together; show the dialog only once.
let lockedAlertVisible = false;

/**
 * Clear tokens, session and cached server data, then tell the user why.
 * Safe to call repeatedly — the alert is de-duplicated.
 */
export function forceLogoutAccountDeactivated(): void {
  clearAuthTokens();
  useAuthStore.getState().clearSession();
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Cleanup is best effort; never block the logout itself.
    }
  });

  if (lockedAlertVisible) return;
  lockedAlertVisible = true;
  Alert.alert(
    LOCKED_TITLE,
    LOCKED_MESSAGE,
    [{ text: 'Đã hiểu', onPress: () => { lockedAlertVisible = false; } }],
    { cancelable: false },
  );
}

/** Test-only: reset the alert de-duplication flag. */
export function __resetForceLogoutStateForTests(): void {
  lockedAlertVisible = false;
}
