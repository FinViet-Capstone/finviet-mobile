/**
 * categories.ts - FinViet system category constants
 *
 * Source of truth for all 13 fixed categories (SPEC Open Question #1 -- RESOLVED).
 * These IDs are stable string constants referenced by:
 *   Transaction.categoryId, Budget.categoryId, all mock data in subsequent sessions.
 *
 * Icon identifiers use Lucide icon names (https://lucide.dev).
 * Map these strings to your icon component of choice in CategoryBadge.
 *
 * Colors are hex values chosen for visual distinctiveness on dark and light backgrounds.
 */

// -------------------------------------------------------------------------
// Category shape
// -------------------------------------------------------------------------

export interface Category {
  readonly id: string;
  /** Vietnamese display label */
  readonly nameVi: string;
  /** English display label */
  readonly nameEn: string;
  /** Icon identifier -- Lucide icon name */
  readonly icon: string;
  /** Hex color string, e.g. "#F97316" -- used in donut chart and category chips */
  readonly color: string;
  /** Always true for system categories; custom categories (v2) will set false */
  readonly isSystem: true;
  /** Display order in category pickers and the donut chart legend */
  readonly sortOrder: number;
}

// -------------------------------------------------------------------------
// Categories array -- as const enables the CategoryId union derivation below
// -------------------------------------------------------------------------

export const CATEGORIES = [
  {
    id: 'cat_food',
    nameVi: 'Ăn uống',
    nameEn: 'Food & Drink',
    icon: 'utensils',
    color: '#F97316',
    isSystem: true as const,
    sortOrder: 1,
  },
  {
    id: 'cat_transport',
    nameVi: 'Di chuyển',
    nameEn: 'Transport',
    icon: 'car',
    color: '#3B82F6',
    isSystem: true as const,
    sortOrder: 2,
  },
  {
    id: 'cat_shopping',
    nameVi: 'Mua sắm',
    nameEn: 'Shopping',
    icon: 'shopping-bag',
    color: '#EC4899',
    isSystem: true as const,
    sortOrder: 3,
  },
  {
    id: 'cat_health',
    nameVi: 'Sức khỏe',
    nameEn: 'Health',
    icon: 'heart-pulse',
    color: '#EF4444',
    isSystem: true as const,
    sortOrder: 4,
  },
  {
    id: 'cat_education',
    nameVi: 'Giáo dục',
    nameEn: 'Education',
    icon: 'book-open',
    color: '#8B5CF6',
    isSystem: true as const,
    sortOrder: 5,
  },
  {
    id: 'cat_housing',
    nameVi: 'Nhà ở',
    nameEn: 'Housing',
    icon: 'home',
    color: '#14B8A6',
    isSystem: true as const,
    sortOrder: 6,
  },
  {
    id: 'cat_entertain',
    nameVi: 'Giải trí',
    nameEn: 'Entertainment',
    icon: 'gamepad-2',
    color: '#F59E0B',
    isSystem: true as const,
    sortOrder: 7,
  },
  {
    id: 'cat_beauty',
    nameVi: 'Làm đẹp',
    nameEn: 'Beauty',
    icon: 'sparkles',
    color: '#D946EF',
    isSystem: true as const,
    sortOrder: 8,
  },
  {
    id: 'cat_bills',
    nameVi: 'Hóa đơn & Tiện ích',
    nameEn: 'Bills & Utilities',
    icon: 'receipt',
    color: '#6366F1',
    isSystem: true as const,
    sortOrder: 9,
  },
  {
    id: 'cat_family',
    nameVi: 'Gia đình',
    nameEn: 'Family',
    icon: 'users',
    color: '#0EA5E9',
    isSystem: true as const,
    sortOrder: 10,
  },
  {
    id: 'cat_savings',
    nameVi: 'Tiết kiệm',
    nameEn: 'Savings',
    icon: 'piggy-bank',
    color: '#22C55E',
    isSystem: true as const,
    sortOrder: 11,
  },
  {
    id: 'cat_income',
    nameVi: 'Thu nhập',
    nameEn: 'Income',
    icon: 'banknote',
    color: '#1A6B3C',
    isSystem: true as const,
    sortOrder: 12,
  },
  {
    id: 'cat_other',
    nameVi: 'Khác',
    nameEn: 'Other',
    icon: 'ellipsis',
    color: '#94A3B8',
    isSystem: true as const,
    sortOrder: 13,
  },
] as const satisfies readonly Category[];

// -------------------------------------------------------------------------
// CategoryId union -- derived from the array so it never drifts out of sync
// -------------------------------------------------------------------------

export type CategoryId = (typeof CATEGORIES)[number]['id'];

// -------------------------------------------------------------------------
// Helper: all expense categories (excludes income)
// Used in budget pickers, donut charts, AI Advisor spend summaries.
// -------------------------------------------------------------------------

export const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c): c is Extract<(typeof CATEGORIES)[number], { id: Exclude<CategoryId, 'cat_income'> }> =>
    c.id !== 'cat_income',
);

// -------------------------------------------------------------------------
// Lookup helper
// -------------------------------------------------------------------------

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
