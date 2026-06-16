/**
 * Unit tests for the formatVND utility.
 * Smoke coverage to ensure the test runner is wired correctly.
 */

import { formatVND } from '@/utils/formatters';

describe('formatVND', () => {
  it('formats whole VND with dot thousands separator', () => {
    expect(formatVND(1000)).toBe('1.000 ₫');
  });

  it('formats large amounts', () => {
    expect(formatVND(12_345_678)).toBe('12.345.678 ₫');
  });

  it('handles zero', () => {
    expect(formatVND(0)).toBe('0 ₫');
  });

  it('strips sign on negatives', () => {
    expect(formatVND(-500_000)).toBe('500.000 ₫');
  });

  it('rounds fractional amounts', () => {
    expect(formatVND(1234.7)).toBe('1.235 ₫');
  });
});
