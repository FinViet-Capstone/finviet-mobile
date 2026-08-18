/**
 * categoryIconStorage.ts — on-device storage for user-picked custom-category
 * icons (svg/png only). Per context/fe-plan-2026-07-revamp.md item 1, the icon
 * file itself never leaves the device — no upload to R2 or the backend, ever.
 * Only the category's metadata (name/bucket/color/type) is a normal syncable
 * record (see types/customCategory.ts).
 *
 * expo-file-system's synchronous File/Directory API (SDK 54+) means every
 * operation here is sync — no async plumbing needed. An in-memory Map is
 * still kept as the read path (hydrateCategoryIconCache() populates it once
 * at boot from disk) so callers never need to touch the filesystem directly,
 * mirroring the sync-cache pattern in lib/mmkv.ts.
 */

import { Directory, File, Paths } from 'expo-file-system';

const ICON_DIR = new Directory(Paths.document, 'category-icons');

const cache = new Map<string, string>();

function ensureDir(): void {
  if (!ICON_DIR.exists) {
    ICON_DIR.create({ intermediates: true });
  }
}

/** Populate the in-memory cache from disk. Call once at app boot (useBootstrapSession). */
export function hydrateCategoryIconCache(): void {
  if (!ICON_DIR.exists) return;
  for (const entry of ICON_DIR.list()) {
    if (entry instanceof File) {
      const match = entry.name.match(/^(.+)\.(svg|png)$/i);
      if (match) cache.set(match[1], entry.uri);
    }
  }
}

export function getCategoryIconUri(categoryId: string): string | undefined {
  return cache.get(categoryId);
}

/** Copies the picked file into permanent on-device storage under this category's id. */
export function saveCategoryIcon(
  categoryId: string,
  pickedUri: string,
  ext: 'svg' | 'png',
): string {
  ensureDir();
  const source = new File(pickedUri);
  const dest = new File(ICON_DIR, `${categoryId}.${ext}`);
  if (dest.exists) dest.delete();
  source.copy(dest);
  cache.set(categoryId, dest.uri);
  return dest.uri;
}

export function deleteCategoryIcon(categoryId: string): void {
  const uri = cache.get(categoryId);
  if (!uri) return;
  cache.delete(categoryId);
  const file = new File(uri);
  if (file.exists) file.delete();
}
