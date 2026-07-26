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
 * categories (customer category buckets), reports/AI (spending score, weekly
 * report, chat history), notifications, rules, SMS extraction, and Finverse
 * bank-linking (see real/finverse.ts + app/link-bank.tsx). Still mock:
 * subscriptions (no backend), and photo/receipt OCR extraction (no backend — only
 * SMS + CSV parsing exist server-side).
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
import * as mockReports from './mock/reports';
import * as realReports from './real/reports';
import * as mockNotifications from './mock/notifications';
import * as realNotifications from './real/notifications';
import * as mockExtraction from './mock/extraction';
import * as realExtraction from './real/extraction';
import * as mockRules from './mock/rules';
import * as realRules from './real/rules';

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
export const withdrawFromWallet = walletsImpl.withdrawFromWallet;
export const getWalletTransactions = walletsImpl.getWalletTransactions;
export type {
  CreateWalletInput,
  UpdateWalletInput,
  WithdrawInput,
  WithdrawResult,
  WalletLedgerQuery,
  WalletLedgerEntry,
  WalletLedgerPage,
} from './mock/wallets';

// ─── Transactions ─────────────────────────────────────────────────────────────
const transactionsImpl = USE_MOCK ? mockTransactions : realTransactions;
export const getTransactions = transactionsImpl.getTransactions;
export const getTransactionById = transactionsImpl.getTransactionById;
export const getRecentTransactions = transactionsImpl.getRecentTransactions;
export const getTransactionSummary = transactionsImpl.getTransactionSummary;
export const createTransaction = transactionsImpl.createTransaction;
export const updateTransaction = transactionsImpl.updateTransaction;
export const classifyTransaction = transactionsImpl.classifyTransaction;
export const deleteTransaction = transactionsImpl.deleteTransaction;
export const createTransfer = transactionsImpl.createTransfer;
export type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateTransferInput,
  CreateTransferResult,
  TransactionSummary,
  TransactionSummaryCategory,
  TransactionSummaryDay,
  TransactionSummaryBeneficiary,
} from './mock/transactions';

// ─── Budgets ────────────────────────────────────────────────────────────────
const budgetsImpl = USE_MOCK ? mockBudgets : realBudgets;
export const getBudgets = budgetsImpl.getBudgets;
export const getBudgetById = budgetsImpl.getBudgetById;
export const getBudgetBuckets = budgetsImpl.getBudgetBuckets;
export const createBudget = budgetsImpl.createBudget;
export const updateBudget = budgetsImpl.updateBudget;
export const deleteBudget = budgetsImpl.deleteBudget;
export type {
  CreateBudgetInput,
  UpdateBudgetInput,
  MonthRange,
  BucketSummary,
  BucketSummaryList,
} from './mock/budgets';

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

// ─── Reports & AI ─────────────────────────────────────────────────────────────
const reportsImpl = USE_MOCK ? mockReports : realReports;
export const getSpendingScore = reportsImpl.getSpendingScore;
export const getWeeklyReport = reportsImpl.getWeeklyReport;
export const getChatHistory = reportsImpl.getChatHistory;
export const getChatSessions = reportsImpl.getChatSessions;
export const getChatSessionMessages = reportsImpl.getChatSessionMessages;
export const sendChatMessage = reportsImpl.sendChatMessage;
export const generateWeeklyReport = reportsImpl.generateWeeklyReport;
export const previewCategorization = reportsImpl.previewCategorization;
export const categorizeTransaction = reportsImpl.categorizeTransaction;
export const overrideCategorization = reportsImpl.overrideCategorization;

// ─── Notifications ────────────────────────────────────────────────────────────
const notificationsImpl = USE_MOCK ? mockNotifications : realNotifications;
export const getNotifications = notificationsImpl.getNotifications;
export const getUnreadNotifications = notificationsImpl.getUnreadNotifications;
export const markNotificationRead = notificationsImpl.markNotificationRead;
export const markAllNotificationsRead = notificationsImpl.markAllNotificationsRead;

// ─── Photo / SMS Extraction ─────────────────────────────────────────────────────
// SMS → real /extract/sms; photo/receipt OCR has no backend, so real re-exports the mock.
const extractionImpl = USE_MOCK ? mockExtraction : realExtraction;
export const extractFromPhoto = extractionImpl.extractFromPhoto;
export const extractFromSMS = extractionImpl.extractFromSMS;

// ─── Rules (merchant → category auto-classification) ────────────────────────────
const rulesImpl = USE_MOCK ? mockRules : realRules;
export const getRules = rulesImpl.getRules;
export const createRule = rulesImpl.createRule;
export const deleteRule = rulesImpl.deleteRule;
export type { CreateRuleInput, CreateRuleResult } from './mock/rules';

// Auth — branch the implementation on USE_MOCK. Input types always come from the
// mock module (plain shapes shared by both implementations).
const authImpl = USE_MOCK ? mockAuth : realAuth;

export const login = authImpl.login;
export const register = authImpl.register;
export const googleOAuth = authImpl.googleOAuth;
export const forgotPassword = authImpl.forgotPassword;
export const resetPassword = authImpl.resetPassword;
export const resendVerification = authImpl.resendVerification;
export const verifyEmail = authImpl.verifyEmail;
export const changePassword = authImpl.changePassword;
export const logout = authImpl.logout;
export const getProfile = authImpl.getProfile;
export const updateProfile = authImpl.updateProfile;
export const uploadAvatar = authImpl.uploadAvatar;
export const deleteAccount = authImpl.deleteAccount;

export type {
  MockLoginInput,
  MockRegisterInput,
  MockChangePasswordInput,
  UpdateProfileInput,
  ResetPasswordInput,
} from './mock/auth';
