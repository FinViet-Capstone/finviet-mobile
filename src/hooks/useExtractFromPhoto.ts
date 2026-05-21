import { useMutation } from '@tanstack/react-query';
import { extractFromPhoto } from '@/services';

export const useExtractFromPhoto = () =>
  useMutation({
    mutationFn: (uri: string) => extractFromPhoto(uri),
  });
