/**
 * FinViet Mock Service Layer
 *
 * All functions are synchronous — no async, no Promise.
 * Screens import directly from this barrel; never from individual mock files.
 *
 * When the real API layer is ready, swap the re-exports below to point at
 * the real service modules — screen code needs zero changes.
 */

/**
 * USE_MOCK — single switch between the mock and (future) real API service
 * modules. Reads EXPO_PUBLIC_USE_MOCK; defaults to mock until the .NET API
 * ships. On integration day, branch the re-exports below on this flag — no
 * screen or hook file changes.
 */
export const USE_MOCK =
  (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').toLowerCase() !== 'false';

/** Base URL of the .NET 8 Web API, read from the active .env file. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

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

// Rules (merchant → category auto-classification)
export { getRules, createRule, deleteRule } from './mock/rules';
export type { CreateRuleInput, CreateRuleResult } from './mock/rules';

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

// Linked Wallet Sync (SePay)
export {
  syncLinkedWalletTransactions,
  getLinkedAccounts,
  getInstitutions,
  createConnectToken,
  exchangeConnection,
} from './linkedWalletSync';
export type { SyncResult } from './linkedWalletSync';
