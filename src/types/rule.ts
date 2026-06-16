/**
 * rule.ts - Merchant → category auto-classification rules.
 *
 * When a user corrects a transaction's category they can "Gán rule" for that
 * merchant. The rule is applied retroactively to existing transactions and
 * (on the real backend) to future imports. Matching is case-insensitive against
 * Transaction.merchant.
 */

export interface Rule {
  id: string;
  customerId: string;
  /** Matched case-insensitively (substring) against transaction.merchant. */
  merchantKeyword: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}
