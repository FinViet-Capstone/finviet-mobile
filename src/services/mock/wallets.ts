import type { Wallet, WalletSummary, WalletType } from '../../types';

// ─── Shared ID Constants ───────────────────────────────────────────────────────
// Exported so transactions.ts and goals.ts can reference the same wallet IDs.

export const USER_ID = 'user_khoi_01' as const;

export const WALLET_IDS = {
  CASH: 'wallet_cash_01',
  MOMO: 'wallet_momo_01',
  BANK: 'wallet_bank_01',
} as const;

// ─── Mock Data (mutable) ───────────────────────────────────────────────────────
// `let` not `const` -- the mutation services rewrite this array in place so
// queries see the new state on the next read.

let WALLETS: Wallet[] = [
  {
    id: WALLET_IDS.CASH,
    userId: USER_ID,
    name: 'Tiền mặt',
    type: 'basic',
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
    type: 'basic',
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
    type: 'basic',
    balance: 15_200_000,
    isPrimary: false,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genId(): string {
  return `wallet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getWallets(): WalletSummary {
  const visible = WALLETS.filter((w) => !w.isDeleted);
  const totalBalance = visible.reduce((sum, w) => sum + w.balance, 0);
  return { wallets: visible, totalBalance };
}

export function getWalletById(id: string): Wallet | undefined {
  return WALLETS.find((w) => w.id === id);
}

// ─── Writes ────────────────────────────────────────────────────────────────────

export interface CreateWalletInput {
  name: string;
  type: WalletType;
  balance: number;
  isPrimary?: boolean;
  linkedMetadata?: {
    institutionId: string;
    institutionName: string;
    accountId: string;
    accountNumber?: string;
    lastSyncAt?: string;
    syncStatus: 'active' | 'error' | 'pending';
    syncError?: string;
  };
}

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  await delay();
  // Demote the existing primary if the new wallet claims primary.
  if (input.isPrimary) {
    WALLETS = WALLETS.map((w) =>
      w.isPrimary ? { ...w, isPrimary: false, updatedAt: nowIso() } : w,
    );
  }
  const wallet: Wallet = {
    id: genId(),
    userId: USER_ID,
    name: input.name.trim(),
    type: input.type,
    balance: input.balance,
    isPrimary: input.isPrimary ?? WALLETS.filter((w) => !w.isDeleted).length === 0,
    isDeleted: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    linkedMetadata: input.linkedMetadata,
  };
  WALLETS = [...WALLETS, wallet];
  return wallet;
}

export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
  isPrimary?: boolean;
}

export async function updateWallet(
  id: string,
  patch: UpdateWalletInput,
): Promise<Wallet> {
  await delay();
  const target = WALLETS.find((w) => w.id === id);
  if (!target) throw new Error('Wallet not found');

  // If we're promoting this wallet to primary, demote whichever was primary.
  if (patch.isPrimary === true) {
    WALLETS = WALLETS.map((w) =>
      w.isPrimary && w.id !== id ? { ...w, isPrimary: false, updatedAt: nowIso() } : w,
    );
  }

  const updated: Wallet = {
    ...target,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.isPrimary !== undefined ? { isPrimary: patch.isPrimary } : {}),
    updatedAt: nowIso(),
  };
  WALLETS = WALLETS.map((w) => (w.id === id ? updated : w));
  return updated;
}

export async function deleteWallet(id: string): Promise<void> {
  await delay();
  // Soft-delete: flip the flag, preserve transactions linked to this wallet.
  WALLETS = WALLETS.map((w) =>
    w.id === id ? { ...w, isDeleted: true, isPrimary: false, updatedAt: nowIso() } : w,
  );
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
