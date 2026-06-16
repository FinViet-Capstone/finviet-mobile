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

export interface TransferPayload {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description?: string;
  transferDate?: string;
}

export interface TransferResult {
  fromTransaction: {
    id: string;
    walletId: string;
    amount: number;
    type: 'transfer_out';
    transferPairId: string;
  };
  toTransaction: {
    id: string;
    walletId: string;
    amount: number;
    type: 'transfer_in';
    transferPairId: string;
  };
}

export interface CreateWalletPayload {
  name: string;
  type: WalletType;
  initialBalance: number;
}

export interface UpdateWalletPayload {
  name?: string;
}
