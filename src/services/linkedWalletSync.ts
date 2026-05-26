import type { Transaction } from '@/types';
import type { FinVerseTransaction } from './finverse';
import { finverseClient } from './finverse';
import { createTransaction, type CreateTransactionInput } from './mock/transactions';
import { MOCK_BANK_TRANSACTIONS, MOCK_BANK_ACCOUNT } from './mock/mockBankData';
import { USER_ID } from './mock/wallets';

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

export interface MockLinkResult {
  walletId: string;
  accountId: string;
  institutionName: string;
  transactionsSynced: number;
}

function mapFinVerseToTransaction(
  fvTx: FinVerseTransaction,
  walletId: string,
  userId: string,
): CreateTransactionInput {
  return {
    walletId,
    categoryId: null,
    amount: Math.abs(fvTx.amount),
    type: fvTx.transaction_type === 'credit' ? 'income' : 'expense',
    description: fvTx.description,
    merchant: fvTx.merchant_name || null,
    transactionDate: fvTx.date,
    entryMethod: 'linked',
    externalId: fvTx.id,
  };
}

export async function syncLinkedWalletTransactions(
  walletId: string,
  userId: string,
  accessToken: string,
  accountId: string,
  startDate?: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

  try {
    const response = await finverseClient.syncTransactions(accessToken, {
      account_id: accountId,
      start_date: startDate,
    });

    for (const fvTx of response.transactions) {
      if (fvTx.pending) {
        result.skipped++;
        continue;
      }

      try {
        const input = mapFinVerseToTransaction(fvTx, walletId, userId);
        await createTransaction(input);
        result.synced++;
      } catch (err) {
        result.errors.push(`Failed to sync tx ${fvTx.id}: ${err}`);
      }
    }
  } catch (err) {
    result.errors.push(`Sync failed: ${err}`);
  }

  return result;
}

export async function getLinkedAccounts(accessToken: string) {
  return finverseClient.getAccounts(accessToken);
}

export async function getInstitutions(country: string = 'VN') {
  return finverseClient.getInstitutions(country);
}

export async function createLinkToken(userId: string) {
  return finverseClient.createLinkToken(userId);
}

export async function exchangePublicToken(publicToken: string) {
  return finverseClient.exchangePublicToken(publicToken);
}

/**
 * Mock function to simulate linking a bank account and syncing transactions
 * For demo purposes only - simulates the full FinVerse flow
 */
export async function mockLinkBankAccount(
  institutionId: string,
  institutionName: string,
  username: string,
  password: string,
): Promise<MockLinkResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create a linked wallet
  const { createWallet } = await import('./mock/wallets');
  const wallet = await createWallet({
    name: `${institutionName} (${MOCK_BANK_ACCOUNT.accountNumber.slice(-4)})`,
    type: 'linked',
    balance: MOCK_BANK_ACCOUNT.balance,
    isPrimary: false,
    linkedMetadata: {
      institutionId: MOCK_BANK_ACCOUNT.institutionId,
      institutionName: MOCK_BANK_ACCOUNT.institutionName,
      accountId: MOCK_BANK_ACCOUNT.accountId,
      accountNumber: MOCK_BANK_ACCOUNT.accountNumber,
      lastSyncAt: new Date().toISOString(),
      syncStatus: 'active',
    },
  });

  // Inject mock transactions
  let syncedCount = 0;
  for (const mockTx of MOCK_BANK_TRANSACTIONS) {
    try {
      await createTransaction({
        ...mockTx,
        walletId: wallet.id,
      } as CreateTransactionInput);
      syncedCount++;
    } catch (err) {
      console.error('Failed to create mock transaction:', err);
    }
  }

  return {
    walletId: wallet.id,
    accountId: MOCK_BANK_ACCOUNT.accountId,
    institutionName,
    transactionsSynced: syncedCount,
  };
}
