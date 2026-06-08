/**
 * categories.ts - FinViet system category constants
 *
 * Source of truth for all system categories.
 * IDs are stable string constants referenced by Transaction.categoryId,
 * Budget.categoryId, and all mock data.
 *
 * `icon` values are Lucide slugs — mapped to Material Symbols via getCategoryIcon()
 * in categoryIcons.ts. Do not use icon values directly in JSX.
 *
 * `defaultBucket` is the system-level fallback for the 3-bucket model.
 * Nullable only for income and uncategorized. Expense categories MUST have a value.
 * User overrides are stored in user_category_buckets (COALESCE on read).
 *
 * Savings bucket is immutable — users cannot drag categories into/out of it.
 */

// -------------------------------------------------------------------------
// Category shape
// -------------------------------------------------------------------------

export type BucketType = 'needs' | 'wants' | 'savings';

export interface Category {
  readonly id: string;
  readonly nameVi: string;
  readonly nameEn: string;
  /** Lucide icon slug — pass to getCategoryIcon() to get Material Symbols name */
  readonly icon: string;
  readonly color: string;
  readonly isSystem: true;
  readonly sortOrder: number;
  /**
   * System-level bucket fallback.
   * Nullable only for cat_income and cat_uncategorized.
   * All expense categories must have a value.
   */
  readonly defaultBucket: BucketType | null;
}

// -------------------------------------------------------------------------
// Categories array
// -------------------------------------------------------------------------

export const CATEGORIES = [
  // ── Needs ──────────────────────────────────────────────────────────────
  {
    id: 'cat_food',
    nameVi: 'Ăn uống',
    nameEn: 'Food & Drink',
    icon: 'utensils',
    color: '#F97316',
    isSystem: true as const,
    sortOrder: 1,
    defaultBucket: 'needs' as const,
  },
  {
    id: 'cat_housing',
    nameVi: 'Nhà ở & Tiện ích',
    nameEn: 'Housing & Utilities',
    icon: 'home',
    color: '#14B8A6',
    isSystem: true as const,
    sortOrder: 2,
    defaultBucket: 'needs' as const,
  },
  {
    id: 'cat_transport',
    nameVi: 'Di chuyển',
    nameEn: 'Transport',
    icon: 'car',
    color: '#3B82F6',
    isSystem: true as const,
    sortOrder: 3,
    defaultBucket: 'needs' as const,
  },
  {
    id: 'cat_health',
    nameVi: 'Sức khỏe & Y tế',
    nameEn: 'Health & Medical',
    icon: 'heart-pulse',
    color: '#EF4444',
    isSystem: true as const,
    sortOrder: 4,
    defaultBucket: 'needs' as const,
  },
  {
    id: 'cat_education',
    nameVi: 'Giáo dục',
    nameEn: 'Education',
    icon: 'book-open',
    color: '#8B5CF6',
    isSystem: true as const,
    sortOrder: 5,
    defaultBucket: 'needs' as const,
  },
  {
    id: 'cat_family',
    nameVi: 'Gửi tiền gia đình',
    nameEn: 'Family Remittance',
    icon: 'users',
    color: '#0EA5E9',
    isSystem: true as const,
    sortOrder: 6,
    defaultBucket: 'needs' as const,
  },
  // ── Wants ──────────────────────────────────────────────────────────────
  {
    id: 'cat_entertain',
    nameVi: 'Giải trí',
    nameEn: 'Entertainment',
    icon: 'gamepad-2',
    color: '#F59E0B',
    isSystem: true as const,
    sortOrder: 7,
    defaultBucket: 'wants' as const,
  },
  {
    id: 'cat_beauty',
    nameVi: 'Quần áo & Thời trang',
    nameEn: 'Clothing & Fashion',
    icon: 'shirt',
    color: '#D946EF',
    isSystem: true as const,
    sortOrder: 8,
    defaultBucket: 'wants' as const,
  },
  {
    id: 'cat_shopping',
    nameVi: 'Mua sắm online',
    nameEn: 'Online Shopping',
    icon: 'shopping-bag',
    color: '#EC4899',
    isSystem: true as const,
    sortOrder: 9,
    defaultBucket: 'wants' as const,
  },
  {
    id: 'cat_dining',
    nameVi: 'Ăn ngoài & Cà phê',
    nameEn: 'Dining Out & Coffee',
    icon: 'coffee',
    color: '#A16207',
    isSystem: true as const,
    sortOrder: 10,
    defaultBucket: 'wants' as const,
  },
  // ── Savings ────────────────────────────────────────────────────────────
  {
    id: 'cat_savings',
    nameVi: 'Tiết kiệm',
    nameEn: 'Savings',
    icon: 'piggy-bank',
    color: '#22C55E',
    isSystem: true as const,
    sortOrder: 11,
    defaultBucket: 'savings' as const,
  },
  {
    id: 'cat_invest',
    nameVi: 'Đầu tư',
    nameEn: 'Investments',
    icon: 'trending-up',
    color: '#10B981',
    isSystem: true as const,
    sortOrder: 12,
    defaultBucket: 'savings' as const,
  },
  // ── Special (no bucket) ────────────────────────────────────────────────
  {
    id: 'cat_income',
    nameVi: 'Thu nhập',
    nameEn: 'Income',
    icon: 'banknote',
    color: '#1A6B3C',
    isSystem: true as const,
    sortOrder: 13,
    defaultBucket: null,
  },
  {
    id: 'cat_uncategorized',
    nameVi: 'Chưa phân loại',
    nameEn: 'Uncategorized',
    icon: 'ellipsis',
    color: '#94A3B8',
    isSystem: true as const,
    sortOrder: 14,
    defaultBucket: null,
  },
] as const satisfies readonly Category[];

// -------------------------------------------------------------------------
// CategoryId union
// -------------------------------------------------------------------------

export type CategoryId = (typeof CATEGORIES)[number]['id'];

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

export const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'cat_income' && c.id !== 'cat_uncategorized',
) as unknown as readonly (Category & { defaultBucket: BucketType })[];

export const CATEGORIES_BY_BUCKET: Record<BucketType, readonly Category[]> = {
  needs: EXPENSE_CATEGORIES.filter((c) => c.defaultBucket === 'needs'),
  wants: EXPENSE_CATEGORIES.filter((c) => c.defaultBucket === 'wants'),
  savings: EXPENSE_CATEGORIES.filter((c) => c.defaultBucket === 'savings'),
};

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getBucketLabel(bucket: BucketType): string {
  return { needs: 'Thiết yếu', wants: 'Mong muốn', savings: 'Tiết kiệm' }[bucket];
}

export function getBucketColor(bucket: BucketType): string {
  return { needs: '#d0bcff', wants: '#ffb690', savings: '#4edea3' }[bucket];
}

export function getBucketIcon(bucket: BucketType): string {
  return { needs: 'home', wants: 'shopping_bag', savings: 'savings' }[bucket];
}
