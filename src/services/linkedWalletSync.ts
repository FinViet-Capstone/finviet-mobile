import type { Transaction } from '@/types';
import type { FinVerseTransaction } from './finverse';
import { finverseClient } from './finverse';
import { createTransaction, type CreateTransactionInput } from './mock/transactions';

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
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
