import { useQuery } from '@tanstack/react-query';
import { getWallets, getWalletById } from '@/services';

export const useWallets = () =>
  useQuery({ queryKey: ['wallets'], queryFn: () => getWallets() });

export const useWalletById = (id: string | undefined) =>
  useQuery({
    queryKey: ['wallets', id],
    queryFn: () => (id ? getWalletById(id) ?? null : null),
    enabled: !!id,
  });
