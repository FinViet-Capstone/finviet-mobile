/**
 * Keeps the source receipt image on this device after an OCR transaction is
 * created. The backend transaction contract currently has no attachment URL,
 * so copying the image out of the picker cache is required if the detail screen
 * should still be able to show it later.
 */

import { Directory, File, Paths } from 'expo-file-system';

const RECEIPT_DIR = new Directory(Paths.document, 'receipt-images');
const RECEIPT_FILE_PATTERN = /^(.+)\.(jpe?g|png|webp|heic|heif)$/i;

const cache = new Map<string, string>();

function ensureDir(): void {
  if (!RECEIPT_DIR.exists) {
    RECEIPT_DIR.create({ intermediates: true });
  }
}

function extensionFromUri(uri: string): string {
  const path = uri.split(/[?#]/, 1)[0];
  const match = path.match(/\.([a-z0-9]+)$/i);
  const extension = match?.[1]?.toLowerCase();
  return extension && /^(jpe?g|png|webp|heic|heif)$/.test(extension)
    ? extension
    : 'jpg';
}

/** Populate the in-memory lookup once when the app starts. */
export function hydrateReceiptImageCache(): void {
  cache.clear();
  if (!RECEIPT_DIR.exists) return;

  for (const entry of RECEIPT_DIR.list()) {
    if (!(entry instanceof File)) continue;
    const match = entry.name.match(RECEIPT_FILE_PATTERN);
    if (match) cache.set(match[1], entry.uri);
  }
}

export function getReceiptImageUri(transactionId: string): string | undefined {
  return cache.get(transactionId);
}

/** Copy a picker/camera image into permanent app storage for this transaction. */
export function saveReceiptImage(transactionId: string, pickedUri: string): string {
  ensureDir();
  deleteReceiptImage(transactionId);

  const extension = extensionFromUri(pickedUri);
  const source = new File(pickedUri);
  const destination = new File(RECEIPT_DIR, `${transactionId}.${extension}`);
  source.copy(destination);
  cache.set(transactionId, destination.uri);
  return destination.uri;
}

export function deleteReceiptImage(transactionId: string): void {
  const cachedUri = cache.get(transactionId);
  cache.delete(transactionId);

  if (cachedUri) {
    const cachedFile = new File(cachedUri);
    if (cachedFile.exists) cachedFile.delete();
  }

  if (!RECEIPT_DIR.exists) return;
  for (const entry of RECEIPT_DIR.list()) {
    if (entry instanceof File && entry.name.startsWith(`${transactionId}.`)) {
      if (entry.exists) entry.delete();
    }
  }
}
