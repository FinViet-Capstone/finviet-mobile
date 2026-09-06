import { useMutation } from '@tanstack/react-query';
import { extractFromPhoto } from '@/services';
import type { PhotoUploadInput } from '@/types';

export const useExtractFromPhoto = () =>
  useMutation({
    mutationFn: (input: string | PhotoUploadInput) => extractFromPhoto(input),
  });
