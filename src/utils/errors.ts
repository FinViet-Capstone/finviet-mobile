/**
 * getApiErrorMessage — pull the human-readable message the .NET backend returns.
 *
 * The API error envelope is { success, message, code, errors }. Axios puts it on
 * error.response.data. We prefer `message`, fall back to the first field error, then
 * to the provided default. Keeps screens from showing a generic "failed" when the
 * server actually explained why (e.g. "Số dư ví không đủ").
 */

import axios from 'axios';

interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]> | null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data?.message && data.message.trim()) return data.message;
    if (data?.errors) {
      const first = Object.values(data.errors)[0]?.[0];
      if (first) return first;
    }
  }
  return fallback;
}
