import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { captureException } from '@/lib/sentry';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: captureException,
  }),
  mutationCache: new MutationCache({
    onError: captureException,
  }),
});
