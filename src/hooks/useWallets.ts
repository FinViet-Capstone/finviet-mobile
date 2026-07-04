import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWallets,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
  createTransfer,
  withdrawFromWallet,
  getWalletTransactions,
  type CreateWalletInput,
  type UpdateWalletInput,
  type CreateTransferInput,
  type WithdrawInput,
  type WalletLedgerQuery,
} from '@/services';
import { syncFinverseWallet } from '@/services/real/finverse';
import { linkSepayAccount, linkSepayWithToken, syncSepayWallet } from '@/services/real/sepay';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useWallets = () =>
  useQuery({
    queryKey: queryKeys.wallets.all(),
    queryFn: () => getWallets(),
    staleTime: STALE_TIME.medium,
  });

export const useWalletById = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.wallets.detail(id),
    queryFn: () => (id ? getWalletById(id) ?? null : null),
    enabled: !!id,
    staleTime: STALE_TIME.medium,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidateWalletDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
  qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
  qc.invalidateQueries({ queryKey: queryKeys.user.all() });
}

export const useCreateWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWalletInput) => createWallet(input),
    onSuccess: () => invalidateWalletDependents(qc),
  });
};

export const useUpdateWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateWalletInput }) =>
      updateWallet(id, patch),
    onSuccess: () => invalidateWalletDependents(qc),
  });
};

export const useDeleteWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWallet(id),
    onSuccess: () => invalidateWalletDependents(qc),
  });
};

export const useCreateTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransferInput) => createTransfer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
    },
  });
};

// ─── Withdraw ────────────────────────────────────────────────────────────────

export const useWithdrawFromWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WithdrawInput) => withdrawFromWallet(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.budgets.all() });
    },
  });
};

// ─── Per-wallet ledger ───────────────────────────────────────────────────────

export const useWalletTransactions = (
  walletId: string | undefined,
  query?: WalletLedgerQuery,
) =>
  useQuery({
    queryKey: queryKeys.wallets.transactions(
      walletId ?? '',
      (query as Record<string, unknown>) ?? null,
    ),
    queryFn: () => getWalletTransactions(walletId!, query),
    enabled: !!walletId,
    staleTime: STALE_TIME.short,
  });

// ─── Finverse sync ───────────────────────────────────────────────────────────

export const useSyncFinverseWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (walletId: string) => syncFinverseWallet(walletId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    },
  });
};

// ─── SePay link + sync ───────────────────────────────────────────────────────

export const useLinkSepayAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, bankAccountId }: { code: string; bankAccountId?: number }) =>
      linkSepayAccount(code, bankAccountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    },
  });
};

export const useLinkSepayWithToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ apiToken, accountNumber }: { apiToken: string; accountNumber?: string }) =>
      linkSepayWithToken(apiToken, accountNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    },
  });
};

export const useSyncSepayWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (walletId: string) => syncSepayWallet(walletId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    },
  });
};
