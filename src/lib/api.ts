/**
 * api.ts — Axios instance for the .NET 8 Web API.
 *
 * - baseURL from EXPO_PUBLIC_API_BASE_URL (e.g. http://localhost:5122/api).
 * - Request interceptor attaches the JWT access token from MMKV.
 * - Response interceptor performs single-flight refresh-token rotation on 401,
 *   then retries the original request. If refresh fails, tokens + session are
 *   cleared so the auth gate sends the user back to login.
 *
 * Backend envelope (see backend AuthController / ApiResponse<T>):
 *   success: { success: true,  message, data: T }
 *   error:   { success: false, message, errors?: { Field: string[] } }
 * Axios rejects on non-2xx; the error body lives on error.response.data.
 */

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '@/lib/env';
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
} from '@/lib/mmkv';
import { useAuthStore } from '@/stores/authStore';

/** Success envelope returned by every .NET endpoint. */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
}

/** Error body shape on a failed (non-2xx) response. */
export interface ApiErrorBody {
  success: false;
  message?: string | null;
  errors?: Record<string, string[]> | null;
}

/** Auth payload returned by login / google-login / refresh-token. */
export interface AuthResponsePayload {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  profile: {
    customerId: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    monthlyIncomeExpected?: number | null;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt?: string | null;
  };
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

// ─── Request: attach access token ─────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response: single-flight 401 refresh rotation ─────────────────────────────

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

/** Refresh via a bare axios call so it never re-enters this interceptor. */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.post<ApiEnvelope<AuthResponsePayload>>(
    `${API_BASE_URL}/auth/refresh-token`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const payload = res.data?.data;
  if (!payload?.accessToken) throw new Error('Malformed refresh response');

  setAuthTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    accessTokenExpiry: payload.accessTokenExpiry,
  });
  return payload.accessToken;
}

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const url: string = original?.url ?? '';

    // Only attempt refresh on a genuine 401 for a non-auth request we haven't
    // already retried, and only if a refresh token exists.
    const isAuthCall = url.includes('/auth/');
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !isAuthCall &&
      getRefreshToken()
    ) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshPromise = null;
        clearAuthTokens();
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

/** Extract the typed `data` from a successful envelope response. */
export function unwrap<T>(res: AxiosResponse<ApiEnvelope<T>>): T {
  return res.data.data as T;
}
