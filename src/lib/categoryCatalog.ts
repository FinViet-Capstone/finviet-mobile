/**
 * categoryCatalog.ts — the set of categories a customer can actually see.
 *
 * `constants/categories.ts` is a compile-time array. It is the right source for
 * *visuals* (colour/icon/order) of the ids it was built with, but it is not the
 * catalog: the backend's `categories` table also holds customer-created rows
 * (id prefixed `custom_`, private to their creator — enforced server-side by
 * `CategoryService.IsVisibleTo`) and any category an admin adds later. Anything
 * that reads only the constant renders those as a raw id, or drops them.
 *
 * So: `GET /categories?type=expense` (via useCustomerCategories) is the catalog,
 * and the constant supplies visuals for the ids it recognises. An unrecognised
 * id falls back to the name/colour/icon the backend sent with it.
 */

import { getCategoryById, type BucketType, type Category } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { getCategoryIconUri } from './categoryIconStorage';
import type { CustomerCategory } from '@/types/category';

/** Backend convention for a customer-created category (`CustomCategoryIdPrefix`). */
const CUSTOM_ID_PREFIX = 'custom_';

const FALLBACK_COLOR = '#94A3B8';
const FALLBACK_ICON = 'category';
/** Unknown ids sort after every id the FE constant knows about. */
const UNRANKED = 9_000;

export function isCustomCategoryId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX);
}

export interface CatalogCategory {
  id: string;
  nameVi: string;
  color: string;
  bucket: BucketType | null;
  /** Material Symbol name — already mapped, render directly with <MaterialIcon>. */
  iconName: string;
  /**
   * Local file URI of a customer-uploaded icon, when one exists on this device.
   * Never synced anywhere (see lib/categoryIconStorage.ts), so it is absent on a
   * fresh install even for a category that had one — `iconName` still applies.
   */
  iconUri?: string;
  isCustom: boolean;
}

export interface CategoryCatalog {
  /** Picker-safe expense categories, system first then customer-created. */
  list: CatalogCategory[];
  /**
   * Resolve any category id for display — not just the ones in `list`. Income
   * categories are global (no per-customer set), and `cat_savings_goal` /
   * `cat_uncategorized` are excluded from `list` but still appear on real
   * transactions, so all of those resolve from the system constant. Undefined
   * only for an id nothing knows about.
   */
  get: (categoryId: string | null | undefined) => CatalogCategory | undefined;
}

function systemFallback(categoryId: string | null | undefined): CatalogCategory | undefined {
  if (!categoryId) return undefined;
  const sysCat = getCategoryById(categoryId);
  return sysCat ? fromSystemCategory(sysCat) : undefined;
}

const EMPTY_CATALOG: CategoryCatalog = { list: [], get: systemFallback };

// Keyed on the query's array identity so every consumer of the same
// useCustomerCategories() result shares one built catalog — a long transaction
// list renders one card per row, and each row resolves a category.
const catalogCache = new WeakMap<object, CategoryCatalog>();

export function buildCategoryCatalog(
  rows: readonly CustomerCategory[] | undefined,
): CategoryCatalog {
  if (!rows) return EMPTY_CATALOG;

  const cached = catalogCache.get(rows);
  if (cached) return cached;

  const list = rows
    .map(toCatalogCategory)
    // `cat_savings_goal` is auto-assigned and never manually picked. The backend
    // already excludes it; this also covers it never reaching a picker if that
    // changes, and drops the FE's own catch-all placeholder the same way.
    .filter((c) => c.id !== 'cat_savings_goal' && c.id !== 'cat_uncategorized')
    .sort(compareCatalogCategories);

  // Indexed off every row, not just the pickable ones, so a transaction sitting
  // on an excluded category still resolves against the customer's own bucket.
  const byId = new Map(rows.map((r) => [r.categoryId, toCatalogCategory(r)]));
  const catalog: CategoryCatalog = {
    list,
    get: (categoryId) =>
      (categoryId ? byId.get(categoryId) : undefined) ?? systemFallback(categoryId),
  };
  catalogCache.set(rows, catalog);
  return catalog;
}

export function toCatalogCategory(row: CustomerCategory): CatalogCategory {
  const sysCat = getCategoryById(row.categoryId);
  const isCustom = isCustomCategoryId(row.categoryId);

  return {
    id: row.categoryId,
    // Prefer the FE constant for a known id so existing rows keep the exact
    // wording/colour they render with today; the backend's own values are the
    // only option for everything else.
    nameVi: sysCat?.nameVi ?? row.nameVi ?? row.categoryId,
    color: sysCat?.color ?? row.color ?? FALLBACK_COLOR,
    bucket: row.bucketId,
    // The constant stores Lucide slugs (mapped via getCategoryIcon); the backend
    // stores Material Symbol names already, so they are passed straight through.
    iconName: sysCat ? getCategoryIcon(sysCat.icon) : row.icon ?? FALLBACK_ICON,
    iconUri: isCustom ? getCategoryIconUri(row.categoryId) : undefined,
    isCustom,
  };
}

/**
 * Adapt an entry of the compiled system catalog. Used where there is no
 * per-customer set to read from (income), and as the pre-load fallback so a
 * picker is never briefly empty.
 */
export function fromSystemCategory(category: Category): CatalogCategory {
  return {
    id: category.id,
    nameVi: category.nameVi,
    color: category.color,
    bucket: category.defaultBucket,
    iconName: getCategoryIcon(category.icon),
    isCustom: false,
  };
}

function rankOf(category: CatalogCategory): number {
  return getCategoryById(category.id)?.sortOrder ?? UNRANKED;
}

function compareCatalogCategories(a: CatalogCategory, b: CatalogCategory): number {
  const rankDiff = rankOf(a) - rankOf(b);
  if (rankDiff !== 0) return rankDiff;
  return a.nameVi.localeCompare(b.nameVi, 'vi');
}
