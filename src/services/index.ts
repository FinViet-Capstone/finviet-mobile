/**
 * FinViet Mock Service Layer
 *
 * All functions are synchronous — no async, no Promise.
 * Screens import directly from this barrel; never from individual mock files.
 *
 * When the real API layer is ready, swap the re-exports below to point at
 * the real service modules — screen code needs zero changes.
 */

// User
export { getUser } from './mock/user';

// Wallets
export { getWallets, getWalletById } from './mock/wallets';

// Transactions
export {
  getTransactions,
  getTransactionById,
  getRecentTransactions,
} from './mock/transactions';
export type { TransactionFilters } from './mock/transactions';

// Budgets
export { getBudgets, getBudgetById } from './mock/budgets';

// Goals
export { getGoals, getGoalById } from './mock/goals';

// Reports & AI
export {
  getSpendingScore,
  getWeeklyReport,
  getChatHistory,
} from './mock/reports';

// Notifications
export { getNotifications, getUnreadNotifications } from './mock/notifications';
