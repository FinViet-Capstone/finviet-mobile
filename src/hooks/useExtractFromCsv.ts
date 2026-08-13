import { useMutation } from '@tanstack/react-query';
import { extractFromCsv } from '@/services';

export const useExtractFromCsv = () =>
  useMutation({
    mutationFn: ({ fileUri, fileName, maxRows }: { fileUri: string; fileName: string; maxRows?: number }) =>
      extractFromCsv(fileUri, fileName, maxRows),
  });
