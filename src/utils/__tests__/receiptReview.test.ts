import { isValidReceiptDate, parseReceiptAmount } from '../receiptReview';

describe('receipt review editing helpers', () => {
  it('normalizes formatted Vietnamese-dong input to a whole number', () => {
    expect(parseReceiptAmount('87.000 đ')).toBe(87000);
    expect(parseReceiptAmount('1,234,567')).toBe(1234567);
    expect(parseReceiptAmount('')).toBe(0);
  });

  it('accepts real receipt dates up to today and rejects invalid/future dates', () => {
    expect(isValidReceiptDate('2018-03-12', '2026-09-04')).toBe(true);
    expect(isValidReceiptDate('2026-09-04', '2026-09-04')).toBe(true);
    expect(isValidReceiptDate('2026-09-05', '2026-09-04')).toBe(false);
    expect(isValidReceiptDate('2026-02-30', '2026-09-04')).toBe(false);
    expect(isValidReceiptDate('12/03/2018', '2026-09-04')).toBe(false);
  });
});
