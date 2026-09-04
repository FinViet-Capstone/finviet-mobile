/** Parse an editable receipt amount as whole Vietnamese dong. */
export function parseReceiptAmount(value: string): number {
  const digits = value.replace(/\D/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

/** A valid receipt date is an ISO calendar date that is not in the future. */
export function isValidReceiptDate(value: string, todayIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const roundTrip = [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, '0'),
    String(parsed.getUTCDate()).padStart(2, '0'),
  ].join('-');
  return roundTrip === value && value <= todayIso;
}
