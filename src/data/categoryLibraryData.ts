/**
 * categoryLibraryData.ts - Strings and data for CategoryLibrarySheet
 */

export const CATEGORY_LIBRARY_STRINGS = {
  title: 'Thêm từ thư viện',
  subtitle: 'Chọn danh mục bạn muốn thêm',
  close: 'Đóng',
  emptyState: 'Không có danh mục nào khả dụng',
  sectionTitles: {
    needs: 'Thiết yếu',
    wants: 'Mong muốn',
    savings: 'Tiết kiệm',
  },
} as const;

/**
 * Maps category IDs to their default bucket assignment
 * Used to group categories in the library sheet
 */
export const CATEGORY_DEFAULT_BUCKETS: Record<string, 'needs' | 'wants' | 'savings'> = {
  cat_food: 'needs',
  cat_transport: 'needs',
  cat_housing: 'needs',
  cat_health: 'needs',
  cat_education: 'needs',
  cat_bills: 'needs',
  cat_family: 'needs',
  cat_shopping: 'wants',
  cat_entertain: 'wants',
  cat_beauty: 'wants',
  cat_savings: 'savings',
  // cat_income and cat_other don't belong to any bucket
} as const;
