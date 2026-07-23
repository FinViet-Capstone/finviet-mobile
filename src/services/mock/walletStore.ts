import type { Wallet } from '../../types';

// ─── Shared ID Constants ───────────────────────────────────────────────────────
// Owned here (not in wallets.ts) so the transactions/goals/etc. services can
// reference the same IDs without importing the wallets service — which would
// re-create the wallets ⇄ transactions import cycle.

export const USER_ID = 'user_khoi_01' as const;

export const WALLET_IDS = {
  CASH: 'wallet_cash_01',
  BANK: 'wallet_bank_01',
} as const;

// ─── Mock Data (mutable) ───────────────────────────────────────────────────────
// `let` not `const` -- the mutation services rewrite this array in place so
// queries see the new state on the next read. Access it only through the
// accessors below so the single owning binding stays in this module.

const nowIso = (): string => new Date().toISOString();

let WALLETS: Wallet[] = [
  {
    id: WALLET_IDS.CASH,
    customerId: USER_ID,
    name: 'Tiền mặt',
    type: 'basic',
    balance: 2_350_000,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: WALLET_IDS.BANK,
    customerId: USER_ID,
    name: 'Vietcombank',
    type: 'basic',
    balance: 15_200_000,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

/** Current wallet array (live reference — treat as read-only). */
export function getAllWallets(): Wallet[] {
  return WALLETS;
}

/** Replace the wallet array (mutation services rewrite in place). */
export function setWallets(next: Wallet[]): void {
  WALLETS = next;
}

/**
 * Internal-use balance adjuster. Called by the transactions service when a
 * transaction is created / updated / deleted so wallet balances stay in sync.
 *
 * Positive `delta` increases balance, negative decreases. No delay -- this is
 * called inside another mutation that already paid the latency cost.
 */
export function adjustWalletBalance(id: string, delta: number): void {
  WALLETS = WALLETS.map((w) =>
    w.id === id
      ? { ...w, balance: w.balance + delta, updatedAt: nowIso() }
      : w,
  );
}
