import type { SePayTransaction } from './sepay';
import { sepayClient } from './sepay';
import { createTransaction, type CreateTransactionInput } from './mock/transactions';
import { MOCK_BANK_TRANSACTIONS, MOCK_BANK_ACCOUNT } from './mock/mockBankData';

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

function mapSePayToTransaction(
  spTx: SePayTransaction,
  walletId: string,
): CreateTransactionInput {
  return {
    walletId,
    categoryId: null,
    amount: Math.abs(spTx.amount),
    type: spTx.direction === 'in' ? 'income' : 'expense',
    description: spTx.description,
    merchant: spTx.counterparty || null,
    transactionDate: spTx.transaction_date,
    entryMethod: 'linked',
    externalId: spTx.id,
  };
}

/**
 * Pull transactions for a linked SePay account and persist them as 'linked'
 * entries. SePay authenticates via a static API token (configured in env), so
 * no per-request access token is needed — the `_accessToken` param is retained
 * for signature stability with the Phase-2 connect flow.
 */
export async function syncLinkedWalletTransactions(
  walletId: string,
  userId: string,
  _accessToken: string,
  accountId: string,
  startDate?: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

  try {
    const response = await sepayClient.syncTransactions({
      account_id: accountId,
      start_date: startDate,
    });

    for (const spTx of response.transactions) {
      if (spTx.pending) {
        result.skipped++;
        continue;
      }

      try {
        await createTransaction(mapSePayToTransaction(spTx, walletId));
        result.synced++;
      } catch (err) {
        result.errors.push(`Failed to sync tx ${spTx.id}: ${err}`);
      }
    }
  } catch (err) {
    result.errors.push(`Sync failed: ${err}`);
  }

  return result;
}

export async function getLinkedAccounts(_accessToken?: string) {
  return sepayClient.getAccounts();
}

export async function getInstitutions(country: string = 'VN') {
  return sepayClient.getInstitutions(country);
}

export async function createConnectToken(userId: string) {
  return sepayClient.createConnectToken(userId);
}

export async function exchangeConnection(connectToken: string) {
  return sepayClient.exchangeConnectToken(connectToken);
}

/**
 * Mock helper: simulate linking a SePay bank account and importing its
 * transactions. Demo only — injects MOCK_BANK_TRANSACTIONS without hitting the
 * live SePay client.
 */
export async function mockLinkBankAccount(
  institutionId: string,
  institutionName: string,
  username: string,
  password: string,
): Promise<MockLinkResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

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
