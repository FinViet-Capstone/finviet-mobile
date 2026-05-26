import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getInstitutions,
  getLinkedAccounts,
  syncLinkedWalletTransactions,
  type SyncResult,
} from '@/services';

export const useInstitutions = (country: string = 'VN') =>
  useQuery({
    queryKey: ['institutions', country],
    queryFn: () => getInstitutions(country),
  });

export const useLinkedAccounts = (accessToken: string | undefined) =>
  useQuery({
    queryKey: ['linked-accounts', accessToken],
    queryFn: () => (accessToken ? getLinkedAccounts(accessToken) : []),
    enabled: !!accessToken,
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
