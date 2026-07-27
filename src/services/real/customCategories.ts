/**
 * real/customCategories.ts — no .NET endpoint yet, forwards to the mock.
 *
 * BE is building a customer-scoped POST /api/categories/custom endpoint (see
 * context/fe-plan-2026-07-revamp.md item 1 reconciliation, BE priority #4).
 * Once it ships, replace these re-exports with real `api` calls — the icon
 * file itself never reaches the backend either way (lib/categoryIconStorage.ts
 * keeps it on-device only). Same pattern as changePassword in real/auth.ts.
 */
export {
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  updateCustomCategoryBucket,
  type CreateCustomCategoryInput,
} from '@/services/mock/customCategories';
