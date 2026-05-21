import type { Wallet, WalletSummary } from '../../types';

// ─── Shared ID Constants ───────────────────────────────────────────────────────
// Exported so transactions.ts and goals.ts can reference the same wallet IDs.

export const USER_ID = 'user_khoi_01' as const;

export const WALLET_IDS = {
  CASH: 'wallet_cash_01',
  MOMO: 'wallet_momo_01',
  BANK: 'wallet_bank_01',
} as const;

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_WALLETS: Wallet[] = [
  {
    id: WALLET_IDS.CASH,
    userId: USER_ID,
    name: 'Tiền mặt',
    type: 'cash',
    balance: 2_350_000,
    isPrimary: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: WALLET_IDS.MOMO,
    userId: USER_ID,
    name: 'Ví MoMo',
    type: 'momo',
    balance: 890_000,
    isPrimary: false,
    isDeleted: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: WALLET_IDS.BANK,
    userId: USER_ID,
    name: 'Vietcombank',
    type: 'bank_account',
    balance: 15_200_000,
    isPrimary: false,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

// ─── Service Functions ─────────────────────────────────────────────────────────

export function getWallets(): WalletSummary {
  const totalBalance = MOCK_WALLETS.reduce((sum, w) => sum + w.balance, 0);
  return { wallets: MOCK_WALLETS, totalBalance };
}

export function getWalletById(id: string): Wallet | undefined {
  return MOCK_WALLETS.find((w) => w.id === id);
}
