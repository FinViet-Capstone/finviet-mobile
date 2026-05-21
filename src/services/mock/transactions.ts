import type { Transaction, TransactionType } from '../../types';
import { USER_ID, WALLET_IDS } from './wallets';

// ─── Filter Type ───────────────────────────────────────────────────────────────

export interface TransactionFilters {
  walletId?: string;
  /** Filter to a specific category. Ignored when uncategorizedOnly is true. */
  categoryId?: string;
  type?: TransactionType;
  /** ISO date string YYYY-MM-DD — inclusive lower bound */
  startDate?: string;
  /** ISO date string YYYY-MM-DD — inclusive upper bound */
  endDate?: string;
  /** When true, returns only transactions with categoryId === null */
  uncategorizedOnly?: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// 34 transactions spanning May 2026.
// Includes:
//   • 3 uncategorized entries   (tx_14, tx_15, tx_26)  — categoryId: null, orange "?" badge
//   • 2 transfer pairs          (pair_01, pair_02)      — for transfer filter tests
//   • Vietnamese merchant names throughout
//
// Every field declared by the Transaction interface is present on every object
// — nullable fields are set to null explicitly (not omitted) so TypeScript strict
// mode does not complain about missing required properties.

const MOCK_TRANSACTIONS: Transaction[] = [
  // ── 01 · Income ──────────────────────────────────────────────────────────────
  {
    id: 'tx_01',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_income',
    amount: 12_000_000,
    type: 'income',
    description: 'Lương tháng 5/2026',
    merchant: 'Công ty ABC Technology',
    transactionDate: '2026-05-01',
    aiSuggestedCategoryId: 'cat_income',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },

  // ── 02 · Housing ─────────────────────────────────────────────────────────────
  {
    id: 'tx_02',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 3_500_000,
    type: 'expense',
    description: 'Tiền thuê phòng tháng 5',
    merchant: 'Chủ nhà',
    transactionDate: '2026-05-01',
    aiSuggestedCategoryId: 'cat_housing',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },

  // ── 03 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_03',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_food',
    amount: 85_000,
    type: 'expense',
    description: 'Đặt cơm trưa',
    merchant: 'Grab Food',
    transactionDate: '2026-05-02',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-02T12:30:00.000Z',
    updatedAt: '2026-05-02T12:30:00.000Z',
  },

  // ── 04 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_04',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 45_000,
    type: 'expense',
    description: 'Đồ ăn vặt',
    merchant: 'Circle K',
    transactionDate: '2026-05-03',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-03T10:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
  },

  // ── 05 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_05',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_food',
    amount: 65_000,
    type: 'expense',
    description: 'Cà phê sáng',
    merchant: 'Highlands Coffee',
    transactionDate: '2026-05-03',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-03T08:00:00.000Z',
    updatedAt: '2026-05-03T08:00:00.000Z',
  },

  // ── 06 · Transport ───────────────────────────────────────────────────────────
  {
    id: 'tx_06',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_transport',
    amount: 35_000,
    type: 'expense',
    description: 'Đi làm buổi sáng',
    merchant: 'Grab',
    transactionDate: '2026-05-04',
    aiSuggestedCategoryId: 'cat_transport',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-04T07:30:00.000Z',
    updatedAt: '2026-05-04T07:30:00.000Z',
  },

  // ── 07 · Shopping ────────────────────────────────────────────────────────────
  {
    id: 'tx_07',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 320_000,
    type: 'expense',
    description: 'Mua đồ gia dụng',
    merchant: 'Shopee',
    transactionDate: '2026-05-05',
    aiSuggestedCategoryId: 'cat_shopping',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-05T14:00:00.000Z',
    updatedAt: '2026-05-05T14:00:00.000Z',
  },

  // ── 08 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_08',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 185_000,
    type: 'expense',
    description: 'Mua thực phẩm cả tuần',
    merchant: 'Bách Hóa Xanh',
    transactionDate: '2026-05-05',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-05T17:00:00.000Z',
    updatedAt: '2026-05-05T17:00:00.000Z',
  },

  // ── 09 · Transfer out — pair_01 (Bank → MoMo) ────────────────────────────────
  {
    id: 'tx_09',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: null,         // transfers are never categorized
    amount: 500_000,
    type: 'transfer_out',
    description: 'Chuyển tiền sang Ví MoMo',
    merchant: null,           // internal transfer — no merchant
    transactionDate: '2026-05-06',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_01',
    imageUrl: null,
    createdAt: '2026-05-06T10:00:00.000Z',
    updatedAt: '2026-05-06T10:00:00.000Z',
  },

  // ── 10 · Transfer in — pair_01 ───────────────────────────────────────────────
  {
    id: 'tx_10',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: null,         // transfers are never categorized
    amount: 500_000,
    type: 'transfer_in',
    description: 'Nhận tiền từ Vietcombank',
    merchant: null,           // internal transfer — no merchant
    transactionDate: '2026-05-06',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_01',
    imageUrl: null,
    createdAt: '2026-05-06T10:00:00.000Z',
    updatedAt: '2026-05-06T10:00:00.000Z',
  },

  // ── 11 · Health ──────────────────────────────────────────────────────────────
  {
    id: 'tx_11',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_health',
    amount: 120_000,
    type: 'expense',
    description: 'Mua thuốc cảm cúm',
    merchant: 'Pharmacity',
    transactionDate: '2026-05-07',
    aiSuggestedCategoryId: 'cat_health',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-07T09:00:00.000Z',
    updatedAt: '2026-05-07T09:00:00.000Z',
  },

  // ── 12 · Entertainment ───────────────────────────────────────────────────────
  {
    id: 'tx_12',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_entertain',
    amount: 149_000,
    type: 'expense',
    description: 'Đăng ký gói tháng',
    merchant: 'Netflix',
    transactionDate: '2026-05-08',
    aiSuggestedCategoryId: 'cat_entertain',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },

  // ── 13 · Shopping ────────────────────────────────────────────────────────────
  {
    id: 'tx_13',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 450_000,
    type: 'expense',
    description: 'Áo thun cotton',
    merchant: 'Uniqlo',
    transactionDate: '2026-05-09',
    aiSuggestedCategoryId: 'cat_shopping',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-09T16:00:00.000Z',
    updatedAt: '2026-05-09T16:00:00.000Z',
  },

  // ── 14 · UNCATEGORIZED — photo entry, orange "?" badge ───────────────────────
  {
    id: 'tx_14',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,         // uncategorized — triggers orange "?" badge in Calendar/Budget
    amount: 100_000,
    type: 'expense',
    description: 'Đổ xăng xe máy',
    merchant: 'Petrolimex',
    transactionDate: '2026-05-10',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'photo',
    transferPairId: null,
    imageUrl: 'https://example.com/receipt_petrolimex.jpg',
    createdAt: '2026-05-10T07:00:00.000Z',
    updatedAt: '2026-05-10T07:00:00.000Z',
  },

  // ── 15 · UNCATEGORIZED — manual entry, orange "?" badge ──────────────────────
  {
    id: 'tx_15',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,         // uncategorized — triggers orange "?" badge in Calendar/Budget
    amount: 230_000,
    type: 'expense',
    description: 'Mua sắm tạp hóa',
    merchant: 'CoopMart',
    transactionDate: '2026-05-10',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-10T11:00:00.000Z',
    updatedAt: '2026-05-10T11:00:00.000Z',
  },

  // ── 16 · Education ───────────────────────────────────────────────────────────
  {
    id: 'tx_16',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_education',
    amount: 299_000,
    type: 'expense',
    description: 'Khoá học lập trình React Native',
    merchant: 'Udemy',
    transactionDate: '2026-05-11',
    aiSuggestedCategoryId: 'cat_education',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-11T20:00:00.000Z',
    updatedAt: '2026-05-11T20:00:00.000Z',
  },

  // ── 17 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_17',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_food',
    amount: 125_000,
    type: 'expense',
    description: 'Bữa trưa nhanh',
    merchant: 'KFC',
    transactionDate: '2026-05-12',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-12T12:00:00.000Z',
    updatedAt: '2026-05-12T12:00:00.000Z',
  },

  // ── 18 · Transport ───────────────────────────────────────────────────────────
  {
    id: 'tx_18',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_transport',
    amount: 42_000,
    type: 'expense',
    description: 'Đặt xe đi siêu thị',
    merchant: 'Grab',
    transactionDate: '2026-05-13',
    aiSuggestedCategoryId: 'cat_transport',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-13T14:00:00.000Z',
    updatedAt: '2026-05-13T14:00:00.000Z',
  },

  // ── 19 · Beauty ──────────────────────────────────────────────────────────────
  {
    id: 'tx_19',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_beauty',
    amount: 165_000,
    type: 'expense',
    description: 'Dưỡng da và chăm sóc tóc',
    merchant: 'Watsons',
    transactionDate: '2026-05-13',
    aiSuggestedCategoryId: 'cat_beauty',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-13T16:30:00.000Z',
    updatedAt: '2026-05-13T16:30:00.000Z',
  },

  // ── 20 · Bills ───────────────────────────────────────────────────────────────
  {
    id: 'tx_20',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_bills',
    amount: 350_000,
    type: 'expense',
    description: 'Tiền điện tháng 5',
    merchant: 'EVN HCMC',
    transactionDate: '2026-05-14',
    aiSuggestedCategoryId: 'cat_bills',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-14T09:00:00.000Z',
    updatedAt: '2026-05-14T09:00:00.000Z',
  },

  // ── 21 · Family ──────────────────────────────────────────────────────────────
  {
    id: 'tx_21',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_family',
    amount: 1_000_000,
    type: 'expense',
    description: 'Gửi tiền về cho gia đình',
    merchant: 'Chuyển khoản Vietcombank',
    transactionDate: '2026-05-15',
    aiSuggestedCategoryId: 'cat_family',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },

  // ── 22 · Transfer out — pair_02 (Cash → MoMo) ────────────────────────────────
  {
    id: 'tx_22',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,         // transfers are never categorized
    amount: 200_000,
    type: 'transfer_out',
    description: 'Chuyển tiền mặt sang MoMo',
    merchant: null,           // internal transfer — no merchant
    transactionDate: '2026-05-15',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_02',
    imageUrl: null,
    createdAt: '2026-05-15T11:00:00.000Z',
    updatedAt: '2026-05-15T11:00:00.000Z',
  },

  // ── 23 · Transfer in — pair_02 ───────────────────────────────────────────────
  {
    id: 'tx_23',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: null,         // transfers are never categorized
    amount: 200_000,
    type: 'transfer_in',
    description: 'Nhận từ tiền mặt',
    merchant: null,           // internal transfer — no merchant
    transactionDate: '2026-05-15',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_02',
    imageUrl: null,
    createdAt: '2026-05-15T11:00:00.000Z',
    updatedAt: '2026-05-15T11:00:00.000Z',
  },

  // ── 24 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_24',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_food',
    amount: 55_000,
    type: 'expense',
    description: 'Cà phê chiều',
    merchant: 'The Coffee House',
    transactionDate: '2026-05-16',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-16T15:00:00.000Z',
    updatedAt: '2026-05-16T15:00:00.000Z',
  },

  // ── 25 · Shopping ────────────────────────────────────────────────────────────
  {
    id: 'tx_25',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_shopping',
    amount: 178_000,
    type: 'expense',
    description: 'Phụ kiện điện thoại',
    merchant: 'Tiki',
    transactionDate: '2026-05-17',
    aiSuggestedCategoryId: 'cat_shopping',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-17T10:00:00.000Z',
    updatedAt: '2026-05-17T10:00:00.000Z',
  },

  // ── 26 · UNCATEGORIZED — photo entry, AI uncertain, orange "?" badge ──────────
  {
    id: 'tx_26',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,         // uncategorized — triggers orange "?" badge in Calendar/Budget
    amount: 45_000,
    type: 'expense',
    description: 'Mua sữa tươi',
    merchant: 'Vinamilk',
    transactionDate: '2026-05-17',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'photo',
    transferPairId: null,
    imageUrl: 'https://example.com/receipt_vinamilk.jpg',
    createdAt: '2026-05-17T19:00:00.000Z',
    updatedAt: '2026-05-17T19:00:00.000Z',
  },

  // ── 27 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_27',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_food',
    amount: 95_000,
    type: 'expense',
    description: 'Đặt pizza tối',
    merchant: 'Grab Food',
    transactionDate: '2026-05-18',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-18T19:30:00.000Z',
    updatedAt: '2026-05-18T19:30:00.000Z',
  },

  // ── 28 · Savings ─────────────────────────────────────────────────────────────
  {
    id: 'tx_28',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_savings',
    amount: 1_000_000,
    type: 'expense',
    description: 'Tiết kiệm cố định tháng 5',
    merchant: 'Quỹ tiết kiệm cá nhân',
    transactionDate: '2026-05-18',
    aiSuggestedCategoryId: 'cat_savings',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-18T09:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },

  // ── 29 · Health ──────────────────────────────────────────────────────────────
  {
    id: 'tx_29',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_health',
    amount: 500_000,
    type: 'expense',
    description: 'Khám sức khỏe định kỳ',
    merchant: 'Bệnh viện FV',
    transactionDate: '2026-05-19',
    aiSuggestedCategoryId: 'cat_health',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-19T10:00:00.000Z',
    updatedAt: '2026-05-19T10:00:00.000Z',
  },

  // ── 30 · Transport ───────────────────────────────────────────────────────────
  {
    id: 'tx_30',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_transport',
    amount: 38_000,
    type: 'expense',
    description: 'Đặt xe về nhà đêm khuya',
    merchant: 'Be',
    transactionDate: '2026-05-19',
    aiSuggestedCategoryId: 'cat_transport',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-19T22:00:00.000Z',
    updatedAt: '2026-05-19T22:00:00.000Z',
  },

  // ── 31 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_31',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 68_000,
    type: 'expense',
    description: 'Ăn sáng và đồ uống',
    merchant: 'GS25',
    transactionDate: '2026-05-20',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-20T07:30:00.000Z',
    updatedAt: '2026-05-20T07:30:00.000Z',
  },

  // ── 32 · Bills ───────────────────────────────────────────────────────────────
  {
    id: 'tx_32',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: 'cat_bills',
    amount: 100_000,
    type: 'expense',
    description: 'Nạp tiền điện thoại',
    merchant: 'Viettel',
    transactionDate: '2026-05-20',
    aiSuggestedCategoryId: 'cat_bills',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-20T11:00:00.000Z',
  },

  // ── 33 · Food ────────────────────────────────────────────────────────────────
  {
    id: 'tx_33',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 89_000,
    type: 'expense',
    description: 'Bữa trưa cùng bạn bè',
    merchant: 'Lotteria',
    transactionDate: '2026-05-21',
    aiSuggestedCategoryId: 'cat_food',
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-21T12:00:00.000Z',
    updatedAt: '2026-05-21T12:00:00.000Z',
  },

  // ── 34 · Shopping (AI override example) ──────────────────────────────────────
  {
    id: 'tx_34',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 560_000,
    type: 'expense',
    description: 'Mua quần áo mùa hè',
    merchant: 'Shopee',
    transactionDate: '2026-05-21',
    // AI suggested 'cat_other'; user manually overrode to 'cat_shopping'
    aiSuggestedCategoryId: 'cat_other',
    aiOverridden: true,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-05-21T10:30:00.000Z',
  },
];

// ─── Service Functions ─────────────────────────────────────────────────────────

/** Returns all transactions, optionally filtered. Results are sorted newest-first. */
export function getTransactions(filters?: TransactionFilters): Transaction[] {
  let result = [...MOCK_TRANSACTIONS];

  if (filters?.walletId !== undefined) {
    result = result.filter((t) => t.walletId === filters.walletId);
  }

  if (filters?.type !== undefined) {
    result = result.filter((t) => t.type === filters.type);
  }

  if (filters?.uncategorizedOnly === true) {
    // categoryId is string | null — null means uncategorized; check === null, not === undefined
    result = result.filter((t) => t.categoryId === null);
  } else if (filters?.categoryId !== undefined) {
    result = result.filter((t) => t.categoryId === filters.categoryId);
  }

  if (filters?.startDate !== undefined) {
    result = result.filter((t) => t.transactionDate >= filters.startDate!);
  }

  if (filters?.endDate !== undefined) {
    result = result.filter((t) => t.transactionDate <= filters.endDate!);
  }

  // Sort newest first; break ties by createdAt
  return result.sort((a, b) => {
    const dateDiff = b.transactionDate.localeCompare(a.transactionDate);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Returns a single transaction by ID, or undefined if not found. */
export function getTransactionById(id: string): Transaction | undefined {
  return MOCK_TRANSACTIONS.find((t) => t.id === id);
}

/**
 * Returns the N most recent transactions (all types, newest-first).
 * Defaults to 10 if n is not specified.
 */
export function getRecentTransactions(n: number = 10): Transaction[] {
  return getTransactions().slice(0, n);
}
