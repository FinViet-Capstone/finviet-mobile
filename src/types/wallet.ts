export type WalletType = 'basic' | 'linked';

export interface LinkedWalletMetadata {
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountNumber?: string;
  lastSyncAt?: string;
  syncStatus: 'active' | 'error' | 'pending';
  syncError?: string;
}

export interface Wallet {
  id: string;
  customerId: string;
  name: string;
  type: WalletType;
  balance: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  linkedMetadata?: LinkedWalletMetadata;
}

export interface WalletSummary {
  wallets: Wallet[];
  totalBalance: number;
}

// -------------------------------------------------------------------------
// Wallet service input/return contracts (services/real/wallets.ts)
// -------------------------------------------------------------------------

export interface CreateWalletInput {
  name: string;
  type: WalletType;
  balance: number;
  linkedMetadata?: LinkedWalletMetadata;
}

export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
}

export interface WithdrawInput {
  fromWalletId: string;
  /** Optional destination wallet (move the money instead of pure expense). */
  toWalletId?: string;
  amount: number;
  description?: string;
}

export interface WithdrawResult {
  fromWalletId: string;
  fromWalletBalance: number;
  toWalletId?: string;
  toWalletBalance?: number;
}

// -------------------------------------------------------------------------
// Per-wallet ledger (GET /wallets/{id}/transactions)
// -------------------------------------------------------------------------

export interface WalletLedgerQuery {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  transactionType?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WalletLedgerEntry {
  transactionId: string;
  walletId: string;
  categoryId: string | null;
  transactionType: string;
  amount: number;
  transactionDate: string;
  note: string | null;
}

export interface WalletLedgerPage {
  items: WalletLedgerEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
