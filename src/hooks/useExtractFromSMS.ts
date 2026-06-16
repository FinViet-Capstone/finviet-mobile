import { useMutation } from '@tanstack/react-query';
import { extractFromSMS } from '@/services';

export const useExtractFromSMS = () =>
  useMutation({
    mutationFn: (text: string) => extractFromSMS(text),
  });
