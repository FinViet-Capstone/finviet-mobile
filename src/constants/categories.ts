export interface Category {
  id: string;
  nameVi: string;
  nameEn: string;
  icon: string; // icon slug — replace with @expo/vector-icons name when icon set is decided
  color: string; // hex
  isSystem: true;
  sortOrder: number;
}

export const CATEGORIES: Category[] = [
  { id: 'cat_food',        nameVi: 'Ăn uống',         nameEn: 'Food & Drink',      icon: 'utensils',      color: '#F97316', isSystem: true, sortOrder: 1 },
  { id: 'cat_transport',   nameVi: 'Di chuyển',        nameEn: 'Transport',         icon: 'car',           color: '#3B82F6', isSystem: true, sortOrder: 2 },
  { id: 'cat_shopping',    nameVi: 'Mua sắm',          nameEn: 'Shopping',          icon: 'shopping-bag',  color: '#EC4899', isSystem: true, sortOrder: 3 },
  { id: 'cat_health',      nameVi: 'Sức khỏe',         nameEn: 'Health',            icon: 'heart-pulse',   color: '#EF4444', isSystem: true, sortOrder: 4 },
  { id: 'cat_education',   nameVi: 'Giáo dục',         nameEn: 'Education',         icon: 'book-open',     color: '#8B5CF6', isSystem: true, sortOrder: 5 },
  { id: 'cat_housing',     nameVi: 'Nhà ở',            nameEn: 'Housing',           icon: 'home',          color: '#14B8A6', isSystem: true, sortOrder: 6 },
  { id: 'cat_entertain',   nameVi: 'Giải trí',         nameEn: 'Entertainment',     icon: 'gamepad-2',     color: '#F59E0B', isSystem: true, sortOrder: 7 },
  { id: 'cat_beauty',      nameVi: 'Làm đẹp',          nameEn: 'Beauty',            icon: 'sparkles',      color: '#D946EF', isSystem: true, sortOrder: 8 },
  { id: 'cat_bills',       nameVi: 'Hóa đơn & Tiện ích', nameEn: 'Bills & Utilities', icon: 'receipt',    color: '#6366F1', isSystem: true, sortOrder: 9 },
  { id: 'cat_family',      nameVi: 'Gia đình',         nameEn: 'Family',            icon: 'users',         color: '#0EA5E9', isSystem: true, sortOrder: 10 },
  { id: 'cat_savings',     nameVi: 'Tiết kiệm',        nameEn: 'Savings',           icon: 'piggy-bank',    color: '#22C55E', isSystem: true, sortOrder: 11 },
  { id: 'cat_income',      nameVi: 'Thu nhập',         nameEn: 'Income',            icon: 'banknote',      color: '#1A6B3C', isSystem: true, sortOrder: 12 },
  { id: 'cat_other',       nameVi: 'Khác',             nameEn: 'Other',             icon: 'ellipsis',      color: '#94A3B8', isSystem: true, sortOrder: 13 },
];

export const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'cat_income',
);

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
