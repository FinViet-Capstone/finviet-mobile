import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWallets,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
  createTransfer,
  type CreateWalletInput,
  type UpdateWalletInput,
  type CreateTransferInput,
} from '@/services';
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
