/**
 * FinViet Mock Service Layer
 *
 * All functions are synchronous — no async, no Promise.
 * Screens import directly from this barrel; never from individual mock files.
 *
 * When the real API layer is ready, swap the re-exports below to point at
 * the real service modules — screen code needs zero changes.
 */

import { USE_MOCK } from '@/lib/env';
import * as mockAuth from './mock/auth';
import * as realAuth from './real/auth';

/**
 * USE_MOCK / API_BASE_URL live in @/lib/env (dependency-free) to avoid an import
 * cycle with the Axios layer. Re-exported here for backward compatibility.
 */
export { USE_MOCK, API_BASE_URL } from '@/lib/env';

// Customer
export { getCustomer } from './mock/user';

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
export type { CreateBudgetInput, UpdateBudgetInput, MonthRange } from './mock/budgets';

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
  getChatSessions,
  getChatSessionMessages,
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

// Auth — branch the implementation on USE_MOCK. Input types always come from the
// mock module (plain shapes shared by both implementations).
const authImpl = USE_MOCK ? mockAuth : realAuth;

export const login = authImpl.login;
export const register = authImpl.register;
export const googleOAuth = authImpl.googleOAuth;
export const forgotPassword = authImpl.forgotPassword;
export const resendVerification = authImpl.resendVerification;
export const verifyEmail = authImpl.verifyEmail;
export const changePassword = authImpl.changePassword;
export const logout = authImpl.logout;
export const getProfile = authImpl.getProfile;

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
