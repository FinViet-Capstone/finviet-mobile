import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getInstitutions,
  getLinkedAccounts,
  syncLinkedWalletTransactions,
  type SyncResult,
} from '@/services';
import { queryKeys, STALE_TIME } from '@/lib/queryKeys';

export const useInstitutions = (country: string = 'VN') =>
  useQuery({
    queryKey: queryKeys.linkedWallet.institutions(country),
    queryFn: () => getInstitutions(country),
    staleTime: STALE_TIME.reference,
  });

export const useLinkedAccounts = (accessToken: string | undefined) =>
  useQuery({
    queryKey: queryKeys.linkedWallet.accounts(accessToken),
    queryFn: () => (accessToken ? getLinkedAccounts(accessToken) : []),
    enabled: !!accessToken,
    staleTime: STALE_TIME.long,
  });

export const useSyncLinkedWallet = () =>
  useMutation<
    SyncResult,
    Error,
    {
      walletId: string;
      userId: string;
      accessToken: string;
      accountId: string;
      startDate?: string;
    }
  >({
    mutationFn: ({ walletId, userId, accessToken, accountId, startDate }) =>
      syncLinkedWalletTransactions(walletId, userId, accessToken, accountId, startDate),
  });
