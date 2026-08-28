/**
 * FinViet Service Layer barrel.
 *
 * Screens/hooks import from this barrel only — never from individual real/*
 * files directly (mock/* no longer exists; every domain is real). Input/return
 * types are re-exported here from @/types so this barrel stays the single
 * import surface, matching the pre-existing convention.
 *
 * Two domains have no real backend and their entry points are hidden
 * client-side rather than wired against nothing: Subscriptions (no
 * customer-facing plan-catalog/status endpoints yet — see
 * finviet-be/docs/subscriptions-customer-endpoints-todo.md) and photo/receipt
 * OCR extraction, whose real endpoint exists but always 503s until a backend
 * OCR provider is configured (surfaced honestly, not faked — see
 * real/extraction.ts).
 */

import * as auth from './real/auth';
import * as wallets from './real/wallets';
import * as transactions from './real/transactions';
import * as budgets from './real/budgets';
import * as incomeAllocation from './real/incomeAllocation';
import * as goals from './real/goals';
import * as customerCategories from './real/categories';
import * as customCategories from './real/customCategories';
import * as reports from './real/reports';
import * as aiPreferences from './real/aiPreferences';
import * as notifications from './real/notifications';
import * as extraction from './real/extraction';
import * as rules from './real/rules';

/** @/lib/env is dependency-free to avoid an import cycle with the Axios layer. */
export { API_BASE_URL } from '@/lib/env';

// ─── Wallets ────────────────────────────────────────────────────────────────
export const getWallets = wallets.getWallets;
export const getWalletById = wallets.getWalletById;
export const createWallet = wallets.createWallet;
export const updateWallet = wallets.updateWallet;
export const deleteWallet = wallets.deleteWallet;
export const withdrawFromWallet = wallets.withdrawFromWallet;
export const getWalletTransactions = wallets.getWalletTransactions;
export type {
  CreateWalletInput,
  UpdateWalletInput,
  WithdrawInput,
  WithdrawResult,
  WalletLedgerQuery,
  WalletLedgerEntry,
  WalletLedgerPage,
} from '@/types';

// ─── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions = transactions.getTransactions;
export const getTransactionById = transactions.getTransactionById;
export const getRecentTransactions = transactions.getRecentTransactions;
export const getTransactionSummary = transactions.getTransactionSummary;
export const createTransaction = transactions.createTransaction;
export const updateTransaction = transactions.updateTransaction;
export const classifyTransaction = transactions.classifyTransaction;
export const deleteTransaction = transactions.deleteTransaction;
export const createTransfer = transactions.createTransfer;
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
} from '@/types';

// ─── Budgets ────────────────────────────────────────────────────────────────
export const getBudgets = budgets.getBudgets;
export const getBudgetById = budgets.getBudgetById;
export const getBudgetBuckets = budgets.getBudgetBuckets;
export const createBudget = budgets.createBudget;
export const updateBudget = budgets.updateBudget;
export const deleteBudget = budgets.deleteBudget;
export type {
  CreateBudgetInput,
  UpdateBudgetInput,
  MonthRange,
  BucketSummary,
  BucketSummaryList,
} from '@/types';

// ─── Income / allocation history ──────────────────────────────────────────────
export const getEffectiveIncomeAllocation = incomeAllocation.getEffectiveIncomeAllocation;
export const getScheduledIncomeAllocation = incomeAllocation.getScheduledIncomeAllocation;
export const scheduleIncomeAllocationChange = incomeAllocation.scheduleIncomeAllocationChange;
export const getSavingsPlanRecommendation = incomeAllocation.getSavingsPlanRecommendation;
export const applySavingsPlanRecommendation = incomeAllocation.applySavingsPlanRecommendation;
export type { IncomeAllocationSetting, ScheduleIncomeAllocationInput } from '@/types';

// ─── Goals ──────────────────────────────────────────────────────────────────
export const getGoals = goals.getGoals;
export const getGoalById = goals.getGoalById;
export const createGoal = goals.createGoal;
export const updateGoal = goals.updateGoal;
export const deleteGoal = goals.deleteGoal;
export const addGoalContribution = goals.addGoalContribution;
export const getContributionsByGoalId = goals.getContributionsByGoalId;
export const withdrawFromGoal = goals.withdrawFromGoal;
export type {
  CreateGoalInput,
  UpdateGoalInput,
  AddContributionInput,
  WithdrawGoalInput,
} from '@/types';

// ─── Customer categories (bucket model) ───────────────────────────────────────
export const getCustomerCategories = customerCategories.getCustomerCategories;
export const moveBucket = customerCategories.moveBucket;
export const bulkMoveBucket = customerCategories.bulkMoveBucket;
export const seedDefaultCategories = customerCategories.seedDefaultCategories;
export type { MoveBucketPayload } from '@/types';

// ─── Custom categories (customer-created, user-picked icon) ───────────────────
export const getCustomCategories = customCategories.getCustomCategories;
export const createCustomCategory = customCategories.createCustomCategory;
export const deleteCustomCategory = customCategories.deleteCustomCategory;
export const updateCustomCategoryBucket = customCategories.updateCustomCategoryBucket;
export const bulkUpdateCustomCategoryBucket = customCategories.bulkUpdateCustomCategoryBucket;
export type { CreateCustomCategoryInput, BulkBucketMove } from '@/types';

// ─── Reports & AI ─────────────────────────────────────────────────────────────
export const getSpendingScore = reports.getSpendingScore;
export const getWeeklyReport = reports.getWeeklyReport;
export const getChatHistory = reports.getChatHistory;
export const getChatSessions = reports.getChatSessions;
export const getChatSessionMessages = reports.getChatSessionMessages;
export const createChatSession = reports.createChatSession;
export const sendChatMessage = reports.sendChatMessage;
export const generateWeeklyReport = reports.generateWeeklyReport;
export const previewCategorization = reports.previewCategorization;
export const categorizeTransaction = reports.categorizeTransaction;
export const overrideCategorization = reports.overrideCategorization;

// ─── Customer AI preferences ──────────────────────────────────────────────────
export const getAiPreferences = aiPreferences.getAiPreferences;
export const updateAiPreferences = aiPreferences.updateAiPreferences;
export type { CategorizationMode, AiPreferences, UpdateAiPreferencesInput } from '@/types';

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = notifications.getNotifications;
export const getUnreadNotifications = notifications.getUnreadNotifications;
export const registerNotificationDevice = notifications.registerNotificationDevice;
export const unregisterNotificationDevice = notifications.unregisterNotificationDevice;
export const markNotificationRead = notifications.markNotificationRead;
export const markAllNotificationsRead = notifications.markAllNotificationsRead;
export type { RegisterNotificationDeviceInput } from '@/types';

// ─── Photo / SMS / CSV Extraction ────────────────────────────────────────────────
export const extractFromPhoto = extraction.extractFromPhoto;
export const extractFromSMS = extraction.extractFromSMS;
export const extractFromCsv = extraction.extractFromCsv;

// ─── Rules (merchant → category auto-classification) ────────────────────────────
export const getRules = rules.getRules;
export const createRule = rules.createRule;
export const deleteRule = rules.deleteRule;
export type { CreateRuleInput, CreateRuleResult } from '@/types';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = auth.login;
export const register = auth.register;
export const googleOAuth = auth.googleOAuth;
export const forgotPassword = auth.forgotPassword;
export const resetPassword = auth.resetPassword;
export const resendVerification = auth.resendVerification;
export const verifyEmail = auth.verifyEmail;
export const changePassword = auth.changePassword;
export const logout = auth.logout;
export const getProfile = auth.getProfile;
export const updateProfile = auth.updateProfile;
export const updateProfileSettings = auth.updateProfileSettings;
export const uploadAvatar = auth.uploadAvatar;
export const deleteAccount = auth.deleteAccount;

export type {
  LoginPayload,
  RegisterPayload,
  ChangePasswordPayload,
  UpdateProfileInput,
  UpdateProfileSettingsInput,
  ResetPasswordPayload,
} from '@/types';
