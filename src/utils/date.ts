/**
 * date.ts — small date helpers for calendar/section rendering.
 *
 * All app dates are stored as 'YYYY-MM-DD' strings (see Transaction.transactionDate).
 * These helpers build and label those ISO date strings without pulling in a
 * locale library — Vietnamese day/weekday labels are hard-coded.
 */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Build a 'YYYY-MM-DD' string. `m` is a 0-based month index (Date convention). */
export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

/** Today as a 'YYYY-MM-DD' string. */
export function todayISO(): string {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

const WEEKDAYS_VI = [
  'Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy',
] as const;

/** Section header label, e.g. "3, Thứ Hai" (day-of-month, weekday). */
export function sectionLabel(iso: string): string {
  const date = new Date(iso + 'T12:00:00');
  const [, , d] = iso.split('-');
  return `${parseInt(d, 10)}, ${WEEKDAYS_VI[date.getDay()]}`;
}
