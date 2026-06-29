/**
 * FinViet Service Layer barrel.
 *
 * Screens/hooks import from this barrel only — never from individual mock/real
 * files. Each feature branches on USE_MOCK: when EXPO_PUBLIC_USE_MOCK="false" the
 * real .NET-backed module is used, otherwise the in-memory mock. Input/return
 * types always come from the mock modules (the shared contract both sides honour),
 * so the swap needs zero hook/screen changes.
 *
 * Wired to the real backend: auth, wallets, transactions, budgets, saving-goals,
 * categories (customer category buckets), category-requests, and SePay linked
 * wallets. Still mock: customer profile, reports/AI, notifications, rules,
 * extraction, subscriptions.
 */

import { USE_MOCK } from '@/lib/env';

import * as mockAuth from './mock/auth';
import * as realAuth from './real/auth';
import * as mockWallets from './mock/wallets';
import * as realWallets from './real/wallets';
import * as mockTransactions from './mock/transactions';
import * as realTransactions from './real/transactions';
import * as mockBudgets from './mock/budgets';
import * as realBudgets from './real/budgets';
import * as mockGoals from './mock/goals';
import * as realGoals from './real/goals';
import * as mockCustomerCategories from './mock/customerCategories';
import * as realCustomerCategories from './real/categories';
import * as mockCategoryRequests from './mock/categoryRequests';
import * as realCategoryRequests from './real/categoryRequests';
import * as mockLinkedWallets from './linkedWalletSync';
import * as realLinkedWallets from './real/linkedWallets';

/**
 * USE_MOCK / API_BASE_URL live in @/lib/env (dependency-free) to avoid an import
 * cycle with the Axios layer. Re-exported here for backward compatibility.
 */
export { USE_MOCK, API_BASE_URL } from '@/lib/env';

// Customer
export { getCustomer } from './mock/user';

// ─── Wallets ────────────────────────────────────────────────────────────────
const walletsImpl = USE_MOCK ? mockWallets : realWallets;
export const getWallets = walletsImpl.getWallets;
export const getWalletById = walletsImpl.getWalletById;
export const createWallet = walletsImpl.createWallet;
export const updateWallet = walletsImpl.updateWallet;
export const deleteWallet = walletsImpl.deleteWallet;
export type { CreateWalletInput, UpdateWalletInput } from './mock/wallets';

// ─── Transactions ─────────────────────────────────────────────────────────────
const transactionsImpl = USE_MOCK ? mockTransactions : realTransactions;
export const getTransactions = transactionsImpl.getTransactions;
export const getTransactionById = transactionsImpl.getTransactionById;
export const getRecentTransactions = transactionsImpl.getRecentTransactions;
export const createTransaction = transactionsImpl.createTransaction;
export const updateTransaction = transactionsImpl.updateTransaction;
export const deleteTransaction = transactionsImpl.deleteTransaction;
export const createTransfer = transactionsImpl.createTransfer;
export type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateTransferInput,
  CreateTransferResult,
} from './mock/transactions';

// ─── Budgets ────────────────────────────────────────────────────────────────
const budgetsImpl = USE_MOCK ? mockBudgets : realBudgets;
export const getBudgets = budgetsImpl.getBudgets;
export const getBudgetById = budgetsImpl.getBudgetById;
export const createBudget = budgetsImpl.createBudget;
export const updateBudget = budgetsImpl.updateBudget;
export const deleteBudget = budgetsImpl.deleteBudget;
export type { CreateBudgetInput, UpdateBudgetInput, MonthRange } from './mock/budgets';

// ─── Goals ──────────────────────────────────────────────────────────────────
const goalsImpl = USE_MOCK ? mockGoals : realGoals;
export const getGoals = goalsImpl.getGoals;
export const getGoalById = goalsImpl.getGoalById;
export const createGoal = goalsImpl.createGoal;
export const updateGoal = goalsImpl.updateGoal;
export const deleteGoal = goalsImpl.deleteGoal;
export const addGoalContribution = goalsImpl.addGoalContribution;
export type {
  CreateGoalInput,
  UpdateGoalInput,
  AddContributionInput,
} from './mock/goals';

// ─── Customer categories (bucket model) ───────────────────────────────────────
const customerCategoriesImpl = USE_MOCK
  ? mockCustomerCategories
  : realCustomerCategories;
export const getCustomerCategories = customerCategoriesImpl.getCustomerCategories;
export const moveBucket = customerCategoriesImpl.moveBucket;
export const seedFromPersona = customerCategoriesImpl.seedFromPersona;
export const deactivateCustomerCategory =
  customerCategoriesImpl.deactivateCustomerCategory;
export type { MoveBucketPayload } from './mock/customerCategories';

// ─── Category requests ────────────────────────────────────────────────────────
const categoryRequestsImpl = USE_MOCK ? mockCategoryRequests : realCategoryRequests;
export const createCategoryRequest = categoryRequestsImpl.createCategoryRequest;
export const getCategoryRequests = categoryRequestsImpl.getCategoryRequests;
export type { CreateCategoryRequestPayload } from './mock/categoryRequests';

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
export const updateProfile = authImpl.updateProfile;

export type {
  MockLoginInput,
  MockRegisterInput,
  MockChangePasswordInput,
  UpdateProfileInput,
} from './mock/auth';

// ─── Linked Wallet Sync (SePay) ───────────────────────────────────────────────
const linkedWalletsImpl = USE_MOCK ? mockLinkedWallets : realLinkedWallets;
export const syncLinkedWalletTransactions =
  linkedWalletsImpl.syncLinkedWalletTransactions;
export const getLinkedAccounts = linkedWalletsImpl.getLinkedAccounts;
export const getInstitutions = linkedWalletsImpl.getInstitutions;
export const createConnectToken = linkedWalletsImpl.createConnectToken;
export const exchangeConnection = linkedWalletsImpl.exchangeConnection;
export type { SyncResult } from './linkedWalletSync';
