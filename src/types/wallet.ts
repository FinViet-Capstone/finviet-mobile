export type WalletType = 'cash' | 'momo' | 'bank_account';

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  isPrimary: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
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
  isPrimary?: boolean;
}

export interface UpdateWalletPayload {
  name?: string;
  isPrimary?: boolean;
}
