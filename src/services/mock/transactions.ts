import type { Transaction, TransactionType } from '../../types';
import { USER_ID, WALLET_IDS, adjustWalletBalance } from './wallets';

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
// `let` not `const` -- mutation services rewrite this in place.

let TRANSACTIONS: Transaction[] = [
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
    externalId: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-02T12:30:00.000Z',
    updatedAt: '2026-05-02T12:30:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-03T10:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-03T08:00:00.000Z',
    updatedAt: '2026-05-03T08:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-04T07:30:00.000Z',
    updatedAt: '2026-05-04T07:30:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-05T14:00:00.000Z',
    updatedAt: '2026-05-05T14:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-05T17:00:00.000Z',
    updatedAt: '2026-05-05T17:00:00.000Z',
  },
  {
    id: 'tx_09',
    userId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: null,
    amount: 500_000,
    type: 'transfer_out',
    description: 'Chuyển tiền sang Ví MoMo',
    merchant: null,
    transactionDate: '2026-05-06',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_01',
    imageUrl: null,
    externalId: null,
    createdAt: '2026-05-06T10:00:00.000Z',
    updatedAt: '2026-05-06T10:00:00.000Z',
  },
  {
    id: 'tx_10',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: null,
    amount: 500_000,
    type: 'transfer_in',
    description: 'Nhận tiền từ Vietcombank',
    merchant: null,
    transactionDate: '2026-05-06',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_01',
    imageUrl: null,
    externalId: null,
    createdAt: '2026-05-06T10:00:00.000Z',
    updatedAt: '2026-05-06T10:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-07T09:00:00.000Z',
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-09T16:00:00.000Z',
    updatedAt: '2026-05-09T16:00:00.000Z',
  },
  {
    id: 'tx_14',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
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
    externalId: null,
    createdAt: '2026-05-10T07:00:00.000Z',
    updatedAt: '2026-05-10T07:00:00.000Z',
  },
  {
    id: 'tx_15',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
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
    externalId: null,
    createdAt: '2026-05-10T11:00:00.000Z',
    updatedAt: '2026-05-10T11:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-11T20:00:00.000Z',
    updatedAt: '2026-05-11T20:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-12T12:00:00.000Z',
    updatedAt: '2026-05-12T12:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-13T14:00:00.000Z',
    updatedAt: '2026-05-13T14:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-13T16:30:00.000Z',
    updatedAt: '2026-05-13T16:30:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-14T09:00:00.000Z',
    updatedAt: '2026-05-14T09:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },
  {
    id: 'tx_22',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
    amount: 200_000,
    type: 'transfer_out',
    description: 'Chuyển tiền mặt sang MoMo',
    merchant: null,
    transactionDate: '2026-05-15',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_02',
    imageUrl: null,
    externalId: null,
    createdAt: '2026-05-15T11:00:00.000Z',
    updatedAt: '2026-05-15T11:00:00.000Z',
  },
  {
    id: 'tx_23',
    userId: USER_ID,
    walletId: WALLET_IDS.MOMO,
    categoryId: null,
    amount: 200_000,
    type: 'transfer_in',
    description: 'Nhận từ tiền mặt',
    merchant: null,
    transactionDate: '2026-05-15',
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: 'pair_02',
    imageUrl: null,
    externalId: null,
    createdAt: '2026-05-15T11:00:00.000Z',
    updatedAt: '2026-05-15T11:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-16T15:00:00.000Z',
    updatedAt: '2026-05-16T15:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-17T10:00:00.000Z',
    updatedAt: '2026-05-17T10:00:00.000Z',
  },
  {
    id: 'tx_26',
    userId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
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
    externalId: null,
    createdAt: '2026-05-17T19:00:00.000Z',
    updatedAt: '2026-05-17T19:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-18T19:30:00.000Z',
    updatedAt: '2026-05-18T19:30:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-18T09:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-19T10:00:00.000Z',
    updatedAt: '2026-05-19T10:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-19T22:00:00.000Z',
    updatedAt: '2026-05-19T22:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-20T07:30:00.000Z',
    updatedAt: '2026-05-20T07:30:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-20T11:00:00.000Z',
  },
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
    externalId: null,
    createdAt: '2026-05-21T12:00:00.000Z',
    updatedAt: '2026-05-21T12:00:00.000Z',
  },
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
    aiSuggestedCategoryId: 'cat_other',
    aiOverridden: true,
    entryMethod: 'manual',
    transferPairId: null,
    imageUrl: null,
    externalId: null,
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-05-21T10:30:00.000Z',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genTxId(): string {
  return `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function genPairId(): string {
  return `pair_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Wallet balance delta produced by a single transaction.
 * Positive = credit the wallet, negative = debit.
 */
function balanceDelta(t: Pick<Transaction, 'amount' | 'type'>): number {
  switch (t.type) {
    case 'income':
    case 'transfer_in':
      return t.amount;
    case 'expense':
    case 'transfer_out':
      return -t.amount;
  }
}

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getTransactions(filters?: TransactionFilters): Transaction[] {
  let result = [...TRANSACTIONS];

  if (filters?.walletId !== undefined) {
    result = result.filter((t) => t.walletId === filters.walletId);
  }
  if (filters?.type !== undefined) {
    result = result.filter((t) => t.type === filters.type);
  }
  if (filters?.uncategorizedOnly === true) {
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

  return result.sort((a, b) => {
    const dateDiff = b.transactionDate.localeCompare(a.transactionDate);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getTransactionById(id: string): Transaction | undefined {
  return TRANSACTIONS.find((t) => t.id === id);
}

export function getRecentTransactions(n: number = 10): Transaction[] {
  return getTransactions().slice(0, n);
}

// ─── Writes ────────────────────────────────────────────────────────────────────

export interface CreateTransactionInput {
  walletId: string;
  categoryId: string | null;
  amount: number;
  type: 'expense' | 'income';
  description: string | null;
  merchant: string | null;
  transactionDate: string;
  aiSuggestedCategoryId?: string | null;
  aiOverridden?: boolean;
  entryMethod: 'manual' | 'photo' | 'csv_import' | 'linked';
  imageUrl?: string | null;
  externalId?: string | null;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  await delay();
  const tx: Transaction = {
    id: genTxId(),
    userId: USER_ID,
    walletId: input.walletId,
    categoryId: input.categoryId,
    amount: input.amount,
    type: input.type,
    description: input.description,
    merchant: input.merchant,
    transactionDate: input.transactionDate,
    aiSuggestedCategoryId: input.aiSuggestedCategoryId ?? null,
    aiOverridden: input.aiOverridden ?? false,
    entryMethod: input.entryMethod,
    transferPairId: null,
    imageUrl: input.imageUrl ?? null,
    externalId: input.externalId ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  TRANSACTIONS = [...TRANSACTIONS, tx];
  adjustWalletBalance(tx.walletId, balanceDelta(tx));
  return tx;
}

export interface UpdateTransactionInput {
  amount?: number;
  description?: string | null;
  merchant?: string | null;
  categoryId?: string | null;
  walletId?: string;
  transactionDate?: string;
}

export async function updateTransaction(
  id: string,
  patch: UpdateTransactionInput,
): Promise<Transaction> {
  await delay();
  const before = TRANSACTIONS.find((t) => t.id === id);
  if (!before) throw new Error('Transaction not found');

  // Transfer legs are immutable on amount/category/wallet (per ARCHITECTURE §5).
  // Higher layers (edit-entry screen) prevent the user from changing those, but
  // belt-and-braces: scrub them out of the patch so a stray call can't corrupt
  // the transfer_pair invariant.
  if (before.type === 'transfer_in' || before.type === 'transfer_out') {
    patch = {
      description: patch.description,
    };
  }

  const after: Transaction = {
    ...before,
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.merchant !== undefined ? { merchant: patch.merchant } : {}),
    ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
    ...(patch.walletId !== undefined ? { walletId: patch.walletId } : {}),
    ...(patch.transactionDate !== undefined
      ? { transactionDate: patch.transactionDate }
      : {}),
    aiOverridden:
      patch.categoryId !== undefined && patch.categoryId !== before.aiSuggestedCategoryId
        ? true
        : before.aiOverridden,
    updatedAt: nowIso(),
  };

  // Reverse the old wallet-side delta, apply the new one.
  // If wallet changed, both wallets are touched.
  adjustWalletBalance(before.walletId, -balanceDelta(before));
  adjustWalletBalance(after.walletId, balanceDelta(after));

  TRANSACTIONS = TRANSACTIONS.map((t) => (t.id === id ? after : t));
  return after;
}

export async function deleteTransaction(id: string): Promise<void> {
  await delay();
  const target = TRANSACTIONS.find((t) => t.id === id);
  if (!target) return;

  // Transfer pair: deleting one leg deletes the other atomically.
  if (target.transferPairId) {
    const both = TRANSACTIONS.filter(
      (t) => t.transferPairId === target.transferPairId,
    );
    both.forEach((t) => adjustWalletBalance(t.walletId, -balanceDelta(t)));
    TRANSACTIONS = TRANSACTIONS.filter(
      (t) => t.transferPairId !== target.transferPairId,
    );
    return;
  }

  adjustWalletBalance(target.walletId, -balanceDelta(target));
  TRANSACTIONS = TRANSACTIONS.filter((t) => t.id !== id);
}

export interface CreateTransferInput {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string | null;
  transactionDate?: string;
}

export interface CreateTransferResult {
  outTx: Transaction;
  inTx: Transaction;
}

export async function createTransfer(
  input: CreateTransferInput,
): Promise<CreateTransferResult> {
  await delay();
  const pairId = genPairId();
  const date = input.transactionDate ?? nowIso().split('T')[0];

  const outTx: Transaction = {
    id: genTxId(),
    userId: USER_ID,
    walletId: input.fromWalletId,
    categoryId: null,
    amount: input.amount,
    type: 'transfer_out',
    description: input.note ?? 'Chuyển tiền nội bộ',
    merchant: null,
    transactionDate: date,
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: pairId,
    imageUrl: null,
    externalId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  // Microsecond gap so the createdAt sort is stable: out leg comes first.
  await new Promise((r) => setTimeout(r, 1));
  const inTx: Transaction = {
    id: genTxId(),
    userId: USER_ID,
    walletId: input.toWalletId,
    categoryId: null,
    amount: input.amount,
    type: 'transfer_in',
    description: input.note ?? 'Nhận tiền nội bộ',
    merchant: null,
    transactionDate: date,
    aiSuggestedCategoryId: null,
    aiOverridden: false,
    entryMethod: 'manual',
    transferPairId: pairId,
    imageUrl: null,
    externalId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  TRANSACTIONS = [...TRANSACTIONS, outTx, inTx];
  adjustWalletBalance(outTx.walletId, balanceDelta(outTx));
  adjustWalletBalance(inTx.walletId, balanceDelta(inTx));
  return { outTx, inTx };
}
