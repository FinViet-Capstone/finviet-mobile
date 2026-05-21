/**
 * formatters.ts — shared formatting utilities for FinViet
 *
 * Imported by components that need to display monetary amounts as strings
 * without rendering a full <AmountText> element (e.g. inside compound text
 * or non-Text contexts).
 *
 * VND rule: amounts are stored as whole Vietnamese Dong (no fractional units).
 * Display convention: dot thousands separator, ₫ suffix.
 * Example: 1500000 → "1.500.000 ₫"
 *
 * We do NOT use toLocaleString('vi-VN') because React Native's JS engine on
 * Android does not reliably support locale-aware number formatting.
 */

/**
 * Formats a number as Vietnamese Dong with dot thousands separator.
 * Always positive — the caller is responsible for sign prefixes.
 *
 * @example formatVND(1_500_000) → "1.500.000 ₫"
 * @example formatVND(-500_000) → "500.000 ₫"  (sign stripped)
 */
export function formatVND(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const str = abs.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return parts.join('.') + ' ₫';
}
