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
export {
  getWallets,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
} from './mock/wallets';
export type { CreateWalletInput, UpdateWalletInput } from './mock/wallets';

// Transactions
export {
  getTransactions,
  getTransactionById,
  getRecentTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransfer,
} from './mock/transactions';
export type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateTransferInput,
  CreateTransferResult,
} from './mock/transactions';

// Budgets
export {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
} from './mock/budgets';
export type { CreateBudgetInput, UpdateBudgetInput } from './mock/budgets';

// Goals
export {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalContribution,
} from './mock/goals';
export type {
  CreateGoalInput,
  UpdateGoalInput,
  AddContributionInput,
} from './mock/goals';

// Reports & AI
export {
  getSpendingScore,
  getWeeklyReport,
  getChatHistory,
} from './mock/reports';

// Notifications
export {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './mock/notifications';

// Photo / SMS Extraction (mock — frozen contract; see types/extraction.ts and constants/extraction.ts)
export { extractFromPhoto, extractFromSMS } from './mock/extraction';

// Auth
export {
  login,
  register,
  googleOAuth,
  forgotPassword,
  resendVerification,
  changePassword,
} from './mock/auth';
export type {
  MockLoginInput,
  MockRegisterInput,
  MockChangePasswordInput,
} from './mock/auth';
