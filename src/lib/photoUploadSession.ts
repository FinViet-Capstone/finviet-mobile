import type { PhotoUploadInput } from '@/types';

/**
 * ImagePicker base64 payloads are too large for Expo Router parameters. Keep
 * them in memory for the short trip from the picker to the confirmation screen
 * and pass only this small opaque id through the route.
 */
const sessions = new Map<string, PhotoUploadInput[]>();

export function createPhotoUploadSession(photos: PhotoUploadInput[]): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  sessions.set(id, photos);
  return id;
}

export function getPhotoUploadSession(id: string | undefined): PhotoUploadInput[] {
  if (!id) return [];
  return sessions.get(id) ?? [];
}

export function deletePhotoUploadSession(id: string | undefined): void {
  if (id) sessions.delete(id);
}
