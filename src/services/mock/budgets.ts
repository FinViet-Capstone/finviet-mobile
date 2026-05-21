import type { BudgetWithSpend } from '../../types';
import { USER_ID } from './wallets';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// 5 budgets across different categories with deliberately varied statuses:
//
//   cat_food      → safe   (40.6% spent)  — GREEN  <60%
//   cat_shopping  → danger (150.8% spent) — RED    >80%  (overspent; triggers 80% notification)
//   cat_transport → warning (61.4% spent) — YELLOW 60–80%
//   cat_health    → warning (77.5% spent) — YELLOW 60–80%
//   cat_bills     → safe   (45.0% spent)  — GREEN  <60%
//
// Spent values are derived from the May 2026 MOCK_TRANSACTIONS in transactions.ts
// and are held as static numbers here — screens do not recompute from raw transactions.

const MOCK_BUDGETS: BudgetWithSpend[] = [
  // ── Ăn uống — GREEN ──────────────────────────────────────────────────────────
  {
    id: 'budget_food_01',
    userId: USER_ID,
    categoryId: 'cat_food',
    monthlyLimit: 2_000_000,
    resetDay: 1,
    categoryName: 'Ăn uống',
    categoryColor: '#F97316',
    categoryIcon: 'utensils',
    // Transactions: tx_03(85k) tx_04(45k) tx_05(65k) tx_08(185k) tx_17(125k)
    //               tx_24(55k) tx_27(95k) tx_31(68k) tx_33(89k)
    spent: 812_000,
    remaining: 1_188_000,
    percentage: 40.6,
    status: 'safe',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },

  // ── Mua sắm — RED (danger / overspent) ───────────────────────────────────────
  {
    id: 'budget_shopping_01',
    userId: USER_ID,
    categoryId: 'cat_shopping',
    monthlyLimit: 1_000_000,
    resetDay: 1,
    categoryName: 'Mua sắm',
    categoryColor: '#EC4899',
    categoryIcon: 'shopping-bag',
    // Transactions: tx_07(320k) tx_13(450k) tx_25(178k) tx_34(560k) = 1,508,000
    spent: 1_508_000,
    remaining: -508_000,
    percentage: 150.8,
    status: 'danger',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },

  // ── Di chuyển — YELLOW (warning) ─────────────────────────────────────────────
  {
    id: 'budget_transport_01',
    userId: USER_ID,
    categoryId: 'cat_transport',
    monthlyLimit: 350_000,
    resetDay: 1,
    categoryName: 'Di chuyển',
    categoryColor: '#3B82F6',
    categoryIcon: 'car',
    // Transactions: tx_06(35k) tx_18(42k) tx_30(38k) + earlier 100k = 215,000
    spent: 215_000,
    remaining: 135_000,
    percentage: 61.4,
    status: 'warning',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },

  // ── Sức khỏe — YELLOW (warning, close to red) ────────────────────────────────
  {
    id: 'budget_health_01',
    userId: USER_ID,
    categoryId: 'cat_health',
    monthlyLimit: 800_000,
    resetDay: 1,
    categoryName: 'Sức khỏe',
    categoryColor: '#EF4444',
    categoryIcon: 'heart-pulse',
    // Transactions: tx_11(120k) tx_29(500k) = 620,000
    spent: 620_000,
    remaining: 180_000,
    percentage: 77.5,
    status: 'warning',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },

  // ── Hóa đơn & Tiện ích — GREEN ───────────────────────────────────────────────
  {
    id: 'budget_bills_01',
    userId: USER_ID,
    categoryId: 'cat_bills',
    monthlyLimit: 1_000_000,
    resetDay: 1,
    categoryName: 'Hóa đơn & Tiện ích',
    categoryColor: '#6366F1',
    categoryIcon: 'receipt',
    // Transactions: tx_20(350k) tx_32(100k) = 450,000
    spent: 450_000,
    remaining: 550_000,
    percentage: 45.0,
    status: 'safe',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

// ─── Service Functions ─────────────────────────────────────────────────────────

export function getBudgets(): BudgetWithSpend[] {
  return MOCK_BUDGETS;
}

export function getBudgetById(id: string): BudgetWithSpend | undefined {
  return MOCK_BUDGETS.find((b) => b.id === id);
}
