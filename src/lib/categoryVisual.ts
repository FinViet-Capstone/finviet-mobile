/**
 * categoryVisual.ts — resolves a category id (system OR custom) to a
 * normalized visual: name, color, bucket, and how to render its icon.
 *
 * `iconKind: 'svg-remote'` exists for forward-compatibility with Flow 1's
 * admin-seeded default categories (backend-managed SVG icons) — no backend
 * SVG catalog exists yet (per context/fe-plan-2026-07-revamp.md item 1
 * reconciliation), so this resolver never actually produces it today; system
 * categories still resolve to 'material' via the existing Lucide-slug mapping
 * until the backend ships that data.
 */

import { getCategoryById, type BucketType } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { getCategoryIconUri } from './categoryIconStorage';
import type { CustomCategory } from '@/types/customCategory';

export type CategoryIconKind = 'material' | 'svg-remote' | 'local-file';

export interface CategoryVisual {
  nameVi: string;
  color: string;
  bucket: BucketType | null;
  iconKind: CategoryIconKind;
  /** Material Symbol name, remote SVG URL, or local file URI, depending on iconKind. */
  iconRef: string;
}

const FALLBACK_COLOR = '#94A3B8';

export function resolveCategoryVisual(
  categoryId: string,
  customCategories: CustomCategory[],
): CategoryVisual {
  const sysCat = getCategoryById(categoryId);
  if (sysCat) {
    return {
      nameVi: sysCat.nameVi,
      color: sysCat.color,
      bucket: sysCat.defaultBucket,
      iconKind: 'material',
      iconRef: getCategoryIcon(sysCat.icon),
    };
  }

  const custom = customCategories.find((c) => c.id === categoryId && c.isActive);
  if (custom) {
    const localUri = getCategoryIconUri(custom.id);
    return {
      nameVi: custom.nameVi,
      color: custom.color,
      bucket: custom.bucketId,
      iconKind: localUri ? 'local-file' : 'material',
      // Falls back to a generic Material Symbol if the on-device icon file is
      // missing (e.g. a fresh install) — it never synced anywhere else, so
      // there's nothing else to recover it from.
      iconRef: localUri ?? 'category',
    };
  }

  return {
    nameVi: 'Khác',
    color: FALLBACK_COLOR,
    bucket: null,
    iconKind: 'material',
    iconRef: 'category',
  };
}
