import type { Transaction, TransactionType, EntryMethod } from '../../types';
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
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_income',
    amount: 12_000_000,
    type: 'income',
    description: 'Lương tháng 5/2026',
    merchant: 'Công ty ABC Technology',
    transactionDate: '2026-05-01',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'tx_02',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 3_500_000,
    type: 'expense',
    description: 'Tiền thuê phòng tháng 5',
    merchant: 'Chủ nhà',
    transactionDate: '2026-05-01',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 'tx_03',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 85_000,
    type: 'expense',
    description: 'Đặt cơm trưa',
    merchant: 'Grab Food',
    transactionDate: '2026-05-02',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-02T12:30:00.000Z',
    updatedAt: '2026-05-02T12:30:00.000Z',
  },
  {
    id: 'tx_04',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 45_000,
    type: 'expense',
    description: 'Đồ ăn vặt',
    merchant: 'Circle K',
    transactionDate: '2026-05-03',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-03T10:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
  },
  {
    id: 'tx_05',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 65_000,
    type: 'expense',
    description: 'Cà phê sáng',
    merchant: 'Highlands Coffee',
    transactionDate: '2026-05-03',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-03T08:00:00.000Z',
    updatedAt: '2026-05-03T08:00:00.000Z',
  },
  {
    id: 'tx_06',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 35_000,
    type: 'expense',
    description: 'Đi làm buổi sáng',
    merchant: 'Grab',
    transactionDate: '2026-05-04',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-04T07:30:00.000Z',
    updatedAt: '2026-05-04T07:30:00.000Z',
  },
  {
    id: 'tx_07',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 320_000,
    type: 'expense',
    description: 'Mua đồ gia dụng',
    merchant: 'Shopee',
    transactionDate: '2026-05-05',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-05T14:00:00.000Z',
    updatedAt: '2026-05-05T14:00:00.000Z',
  },
  {
    id: 'tx_08',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 185_000,
    type: 'expense',
    description: 'Mua thực phẩm cả tuần',
    merchant: 'Bách Hóa Xanh',
    transactionDate: '2026-05-05',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-05T17:00:00.000Z',
    updatedAt: '2026-05-05T17:00:00.000Z',
  },
  {
    id: 'tx_11',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_health',
    amount: 120_000,
    type: 'expense',
    description: 'Mua thuốc cảm cúm',
    merchant: 'Pharmacity',
    transactionDate: '2026-05-07',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-07T09:00:00.000Z',
    updatedAt: '2026-05-07T09:00:00.000Z',
  },
  {
    id: 'tx_12',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_entertain',
    amount: 149_000,
    type: 'expense',
    description: 'Đăng ký gói tháng',
    merchant: 'Netflix',
    transactionDate: '2026-05-08',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'tx_13',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 450_000,
    type: 'expense',
    description: 'Áo thun cotton',
    merchant: 'Uniqlo',
    transactionDate: '2026-05-09',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-09T16:00:00.000Z',
    updatedAt: '2026-05-09T16:00:00.000Z',
  },
  {
    id: 'tx_14',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
    amount: 100_000,
    type: 'expense',
    description: 'Đổ xăng xe máy',
    merchant: 'Petrolimex',
    transactionDate: '2026-05-10',
    entryMethod: 'photo',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-10T07:00:00.000Z',
    updatedAt: '2026-05-10T07:00:00.000Z',
  },
  {
    id: 'tx_15',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
    amount: 230_000,
    type: 'expense',
    description: 'Mua sắm tạp hóa',
    merchant: 'CoopMart',
    transactionDate: '2026-05-10',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-10T11:00:00.000Z',
    updatedAt: '2026-05-10T11:00:00.000Z',
  },
  {
    id: 'tx_16',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_education',
    amount: 299_000,
    type: 'expense',
    description: 'Khoá học lập trình React Native',
    merchant: 'Udemy',
    transactionDate: '2026-05-11',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-11T20:00:00.000Z',
    updatedAt: '2026-05-11T20:00:00.000Z',
  },
  {
    id: 'tx_17',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 125_000,
    type: 'expense',
    description: 'Bữa trưa nhanh',
    merchant: 'KFC',
    transactionDate: '2026-05-12',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-12T12:00:00.000Z',
    updatedAt: '2026-05-12T12:00:00.000Z',
  },
  {
    id: 'tx_18',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 42_000,
    type: 'expense',
    description: 'Đặt xe đi siêu thị',
    merchant: 'Grab',
    transactionDate: '2026-05-13',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-13T14:00:00.000Z',
    updatedAt: '2026-05-13T14:00:00.000Z',
  },
  {
    id: 'tx_19',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_beauty',
    amount: 165_000,
    type: 'expense',
    description: 'Dưỡng da và chăm sóc tóc',
    merchant: 'Watsons',
    transactionDate: '2026-05-13',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-13T16:30:00.000Z',
    updatedAt: '2026-05-13T16:30:00.000Z',
  },
  {
    id: 'tx_20',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 350_000,
    type: 'expense',
    description: 'Tiền điện tháng 5',
    merchant: 'EVN HCMC',
    transactionDate: '2026-05-14',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-14T09:00:00.000Z',
    updatedAt: '2026-05-14T09:00:00.000Z',
  },
  {
    id: 'tx_21',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_family',
    amount: 1_000_000,
    type: 'expense',
    description: 'Gửi tiền về cho gia đình',
    merchant: 'Chuyển khoản Vietcombank',
    transactionDate: '2026-05-15',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },
  {
    id: 'tx_24',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 55_000,
    type: 'expense',
    description: 'Cà phê chiều',
    merchant: 'The Coffee House',
    transactionDate: '2026-05-16',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-16T15:00:00.000Z',
    updatedAt: '2026-05-16T15:00:00.000Z',
  },
  {
    id: 'tx_25',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_shopping',
    amount: 178_000,
    type: 'expense',
    description: 'Phụ kiện điện thoại',
    merchant: 'Tiki',
    transactionDate: '2026-05-17',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-17T10:00:00.000Z',
    updatedAt: '2026-05-17T10:00:00.000Z',
  },
  {
    id: 'tx_26',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
    amount: 45_000,
    type: 'expense',
    description: 'Mua sữa tươi',
    merchant: 'Vinamilk',
    transactionDate: '2026-05-17',
    entryMethod: 'photo',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-17T19:00:00.000Z',
    updatedAt: '2026-05-17T19:00:00.000Z',
  },
  {
    id: 'tx_27',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 95_000,
    type: 'expense',
    description: 'Đặt pizza tối',
    merchant: 'Grab Food',
    transactionDate: '2026-05-18',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-18T19:30:00.000Z',
    updatedAt: '2026-05-18T19:30:00.000Z',
  },
  {
    id: 'tx_28',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_savings',
    amount: 1_000_000,
    type: 'expense',
    description: 'Tiết kiệm cố định tháng 5',
    merchant: 'Quỹ tiết kiệm cá nhân',
    transactionDate: '2026-05-18',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-18T09:00:00.000Z',
    updatedAt: '2026-05-18T09:00:00.000Z',
  },
  {
    id: 'tx_29',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_health',
    amount: 500_000,
    type: 'expense',
    description: 'Khám sức khỏe định kỳ',
    merchant: 'Bệnh viện FV',
    transactionDate: '2026-05-19',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-19T10:00:00.000Z',
    updatedAt: '2026-05-19T10:00:00.000Z',
  },
  {
    id: 'tx_30',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 38_000,
    type: 'expense',
    description: 'Đặt xe về nhà đêm khuya',
    merchant: 'Be',
    transactionDate: '2026-05-19',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-19T22:00:00.000Z',
    updatedAt: '2026-05-19T22:00:00.000Z',
  },
  {
    id: 'tx_31',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 68_000,
    type: 'expense',
    description: 'Ăn sáng và đồ uống',
    merchant: 'GS25',
    transactionDate: '2026-05-20',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-20T07:30:00.000Z',
    updatedAt: '2026-05-20T07:30:00.000Z',
  },
  {
    id: 'tx_32',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_housing',
    amount: 100_000,
    type: 'expense',
    description: 'Nạp tiền điện thoại',
    merchant: 'Viettel',
    transactionDate: '2026-05-20',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-20T11:00:00.000Z',
  },
  {
    id: 'tx_33',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 89_000,
    type: 'expense',
    description: 'Bữa trưa cùng bạn bè',
    merchant: 'Lotteria',
    transactionDate: '2026-05-21',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-21T12:00:00.000Z',
    updatedAt: '2026-05-21T12:00:00.000Z',
  },
  {
    id: 'tx_34',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 560_000,
    type: 'expense',
    description: 'Mua quần áo mùa hè',
    merchant: 'Shopee',
    transactionDate: '2026-05-21',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-05-21T10:30:00.000Z',
  },

  // ─── April 2026 (prior-month baseline for May trend deltas) ──────────────
  {
    id: 'tx_apr_01',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_income',
    amount: 12_000_000,
    type: 'income',
    description: 'Lương tháng 4/2026',
    merchant: 'Công ty ABC Technology',
    transactionDate: '2026-04-05',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-05T09:00:00.000Z',
    updatedAt: '2026-04-05T09:00:00.000Z',
  },
  {
    id: 'tx_apr_02',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 3_500_000,
    type: 'expense',
    description: 'Tiền thuê phòng tháng 4',
    merchant: 'Chủ nhà',
    transactionDate: '2026-04-01',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'tx_apr_03',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 165_000,
    type: 'expense',
    description: 'Đi chợ đầu tháng',
    merchant: 'Bách Hóa Xanh',
    transactionDate: '2026-04-03',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-03T17:00:00.000Z',
    updatedAt: '2026-04-03T17:00:00.000Z',
  },
  {
    id: 'tx_apr_04',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 320_000,
    type: 'expense',
    description: 'Tiền điện tháng 4',
    merchant: 'EVN HCMC',
    transactionDate: '2026-04-08',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-08T09:00:00.000Z',
    updatedAt: '2026-04-08T09:00:00.000Z',
  },
  {
    id: 'tx_apr_05',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 280_000,
    type: 'expense',
    description: 'Đổ xăng xe máy',
    merchant: 'Petrolimex',
    transactionDate: '2026-04-10',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z',
  },
  {
    id: 'tx_apr_06',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_entertain',
    amount: 149_000,
    type: 'expense',
    description: 'Đăng ký gói tháng',
    merchant: 'Netflix',
    transactionDate: '2026-04-08',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T00:00:00.000Z',
  },
  {
    id: 'tx_apr_07',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 92_000,
    type: 'expense',
    description: 'Ăn trưa văn phòng',
    merchant: 'Cơm tấm Cali',
    transactionDate: '2026-04-12',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-12T12:00:00.000Z',
    updatedAt: '2026-04-12T12:00:00.000Z',
  },
  {
    id: 'tx_apr_08',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 540_000,
    type: 'expense',
    description: 'Giày thể thao',
    merchant: 'Shopee',
    transactionDate: '2026-04-15',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-15T14:00:00.000Z',
    updatedAt: '2026-04-15T14:00:00.000Z',
  },
  {
    id: 'tx_apr_09',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_dining',
    amount: 175_000,
    type: 'expense',
    description: 'Cà phê cuối tuần',
    merchant: 'The Coffee House',
    transactionDate: '2026-04-19',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-19T15:00:00.000Z',
    updatedAt: '2026-04-19T15:00:00.000Z',
  },
  {
    id: 'tx_apr_10',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_family',
    amount: 1_000_000,
    type: 'expense',
    description: 'Gửi tiền về cho gia đình',
    merchant: 'Chuyển khoản Vietcombank',
    transactionDate: '2026-04-20',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
  },
  {
    id: 'tx_apr_11',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_savings',
    amount: 1_500_000,
    type: 'expense',
    description: 'Tiết kiệm cố định tháng 4',
    merchant: 'Quỹ tiết kiệm cá nhân',
    transactionDate: '2026-04-25',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-25T09:00:00.000Z',
    updatedAt: '2026-04-25T09:00:00.000Z',
  },
  {
    id: 'tx_apr_12',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_health',
    amount: 210_000,
    type: 'expense',
    description: 'Mua vitamin',
    merchant: 'Pharmacity',
    transactionDate: '2026-04-27',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-27T11:00:00.000Z',
    updatedAt: '2026-04-27T11:00:00.000Z',
  },

  {
    id: 'tx_apr_13',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_dining',
    amount: 95_000,
    type: 'expense',
    description: 'Cà phê làm việc',
    merchant: 'The Coffee House',
    transactionDate: '2026-04-22',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-22T15:00:00.000Z',
    updatedAt: '2026-04-22T15:00:00.000Z',
  },
  {
    id: 'tx_apr_14',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_entertain',
    amount: 59_000,
    type: 'expense',
    description: 'Gói nhạc Spotify',
    merchant: 'Spotify',
    transactionDate: '2026-04-14',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
  },
  {
    id: 'tx_apr_15',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_invest',
    amount: 2_000_000,
    type: 'expense',
    description: 'Mua chứng chỉ quỹ mở',
    merchant: 'Fmarket',
    transactionDate: '2026-04-26',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-26T09:00:00.000Z',
    updatedAt: '2026-04-26T09:00:00.000Z',
  },
  {
    id: 'tx_apr_16',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_beauty',
    amount: 150_000,
    type: 'expense',
    description: 'Mỹ phẩm chăm sóc da',
    merchant: 'Watsons',
    transactionDate: '2026-04-18',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-18T16:00:00.000Z',
    updatedAt: '2026-04-18T16:00:00.000Z',
  },
  {
    id: 'tx_apr_17',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 110_000,
    type: 'expense',
    description: 'Cơm tối giao tận nơi',
    merchant: 'ShopeeFood',
    transactionDate: '2026-04-24',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-24T19:00:00.000Z',
    updatedAt: '2026-04-24T19:00:00.000Z',
  },
  {
    id: 'tx_apr_18',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 50_000,
    type: 'expense',
    description: 'Grab đi cà phê',
    merchant: 'Grab',
    transactionDate: '2026-04-28',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-28T18:00:00.000Z',
    updatedAt: '2026-04-28T18:00:00.000Z',
  },
  {
    id: 'tx_apr_19',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: null,
    amount: 200_000,
    type: 'expense',
    description: 'Thanh toán đơn hàng',
    merchant: 'Lazada',
    transactionDate: '2026-04-16',
    entryMethod: 'photo',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-16T13:00:00.000Z',
    updatedAt: '2026-04-16T13:00:00.000Z',
  },
  {
    id: 'tx_apr_20',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 280_000,
    type: 'expense',
    description: 'Phụ kiện công nghệ',
    merchant: 'Tiki',
    transactionDate: '2026-04-29',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-04-29T10:00:00.000Z',
    updatedAt: '2026-04-29T10:00:00.000Z',
  },

  // ─── June 2026 (current month — through ~the 10th) ───────────────────────
  {
    id: 'tx_jun_01',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_income',
    amount: 12_000_000,
    type: 'income',
    description: 'Lương tháng 6/2026',
    merchant: 'Công ty ABC Technology',
    transactionDate: '2026-06-05',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-05T09:00:00.000Z',
    updatedAt: '2026-06-05T09:00:00.000Z',
  },
  {
    id: 'tx_jun_02',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 3_500_000,
    type: 'expense',
    description: 'Tiền thuê phòng tháng 6',
    merchant: 'Chủ nhà',
    transactionDate: '2026-06-01',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'tx_jun_03',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 78_000,
    type: 'expense',
    description: 'Ăn sáng',
    merchant: 'Phở Lệ',
    transactionDate: '2026-06-02',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-02T07:30:00.000Z',
    updatedAt: '2026-06-02T07:30:00.000Z',
  },
  {
    id: 'tx_jun_04',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 45_000,
    type: 'expense',
    description: 'Grab đi làm',
    merchant: 'Grab',
    transactionDate: '2026-06-03',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-03T08:00:00.000Z',
    updatedAt: '2026-06-03T08:00:00.000Z',
  },
  {
    id: 'tx_jun_05',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_housing',
    amount: 380_000,
    type: 'expense',
    description: 'Tiền điện tháng 6',
    merchant: 'EVN HCMC',
    transactionDate: '2026-06-06',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-06T09:00:00.000Z',
    updatedAt: '2026-06-06T09:00:00.000Z',
  },
  {
    id: 'tx_jun_06',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
    amount: 55_000,
    type: 'expense',
    description: 'Mua đồ tạp hóa',
    merchant: 'Circle K',
    transactionDate: '2026-06-07',
    entryMethod: 'photo',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-07T19:00:00.000Z',
    updatedAt: '2026-06-07T19:00:00.000Z',
  },
  {
    id: 'tx_jun_07',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_dining',
    amount: 220_000,
    type: 'expense',
    description: 'Ăn tối cùng bạn',
    merchant: 'Pizza 4Ps',
    transactionDate: '2026-06-08',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-08T19:30:00.000Z',
    updatedAt: '2026-06-08T19:30:00.000Z',
  },
  {
    id: 'tx_jun_08',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 135_000,
    type: 'expense',
    description: 'Đi chợ tuần',
    merchant: 'Bách Hóa Xanh',
    transactionDate: '2026-06-09',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-09T17:00:00.000Z',
    updatedAt: '2026-06-09T17:00:00.000Z',
  },
  {
    id: 'tx_jun_09',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_savings',
    amount: 1_500_000,
    type: 'expense',
    description: 'Tiết kiệm cố định tháng 6',
    merchant: 'Quỹ tiết kiệm cá nhân',
    transactionDate: '2026-06-10',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-10T09:00:00.000Z',
    updatedAt: '2026-06-10T09:00:00.000Z',
  },
  {
    id: 'tx_jun_10',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_transport',
    amount: 60_000,
    type: 'expense',
    description: 'Grab về nhà',
    merchant: 'Grab',
    transactionDate: '2026-06-10',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-10T18:00:00.000Z',
    updatedAt: '2026-06-10T18:00:00.000Z',
  },
  {
    id: 'tx_jun_11',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_dining',
    amount: 85_000,
    type: 'expense',
    description: 'Cà phê cuối tuần',
    merchant: 'Highlands Coffee',
    transactionDate: '2026-06-04',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-04T15:30:00.000Z',
    updatedAt: '2026-06-04T15:30:00.000Z',
  },
  {
    id: 'tx_jun_12',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_entertain',
    amount: 149_000,
    type: 'expense',
    description: 'Đăng ký gói tháng',
    merchant: 'Netflix',
    transactionDate: '2026-06-08',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-08T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
  {
    id: 'tx_jun_13',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_invest',
    amount: 2_000_000,
    type: 'expense',
    description: 'Đầu tư quỹ mở định kỳ',
    merchant: 'Fmarket',
    transactionDate: '2026-06-10',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-10T09:30:00.000Z',
    updatedAt: '2026-06-10T09:30:00.000Z',
  },
  {
    id: 'tx_jun_14',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_beauty',
    amount: 180_000,
    type: 'expense',
    description: 'Dưỡng da và mỹ phẩm',
    merchant: 'Watsons',
    transactionDate: '2026-06-09',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-09T16:30:00.000Z',
    updatedAt: '2026-06-09T16:30:00.000Z',
  },
  {
    id: 'tx_jun_15',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_health',
    amount: 90_000,
    type: 'expense',
    description: 'Mua thuốc',
    merchant: 'Pharmacity',
    transactionDate: '2026-06-06',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-06T11:00:00.000Z',
    updatedAt: '2026-06-06T11:00:00.000Z',
  },
  {
    id: 'tx_jun_16',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: null,
    amount: 65_000,
    type: 'expense',
    description: 'Mua đồ lặt vặt',
    merchant: 'Shopee',
    transactionDate: '2026-06-07',
    entryMethod: 'csv_import',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-07T20:00:00.000Z',
    updatedAt: '2026-06-07T20:00:00.000Z',
  },
  {
    id: 'tx_jun_17',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: 'cat_food',
    amount: 120_000,
    type: 'expense',
    description: 'Đi chợ đầu tuần',
    merchant: 'Bách Hóa Xanh',
    transactionDate: '2026-06-03',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-03T17:30:00.000Z',
    updatedAt: '2026-06-03T17:30:00.000Z',
  },
  {
    id: 'tx_jun_18',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: 'cat_shopping',
    amount: 340_000,
    type: 'expense',
    description: 'Mua đồ dùng cá nhân',
    merchant: 'Shopee',
    transactionDate: '2026-06-05',
    entryMethod: 'manual',
    transferPairId: null,
    externalId: null,
    createdAt: '2026-06-05T14:00:00.000Z',
    updatedAt: '2026-06-05T14:00:00.000Z',
  },

  // ── June · internal transfer pair (BANK → CASH) — test transfer rendering ──
  {
    id: 'tx_jun_xfer_out',
    customerId: USER_ID,
    walletId: WALLET_IDS.BANK,
    categoryId: null,
    amount: 1_000_000,
    type: 'transfer_out',
    description: 'Rút tiền mặt tiêu Tết',
    merchant: null,
    transactionDate: '2026-06-02',
    entryMethod: 'manual',
    transferPairId: 'pair_jun_demo_01',
    externalId: null,
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
  },
  {
    id: 'tx_jun_xfer_in',
    customerId: USER_ID,
    walletId: WALLET_IDS.CASH,
    categoryId: null,
    amount: 1_000_000,
    type: 'transfer_in',
    description: 'Rút tiền mặt tiêu Tết',
    merchant: null,
    transactionDate: '2026-06-02',
    entryMethod: 'manual',
    transferPairId: 'pair_jun_demo_01',
    externalId: null,
    createdAt: '2026-06-02T10:00:01.000Z',
    updatedAt: '2026-06-02T10:00:01.000Z',
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
    // Transfer legs carry categoryId === null but are NOT "uncategorized spend" —
    // they must never count toward the uncategorized total/warning.
    result = result.filter(
      (t) =>
        t.categoryId === null &&
        t.type !== 'transfer_in' &&
        t.type !== 'transfer_out',
    );
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

/**
 * Retroactively assign `categoryId` to every non-transfer transaction whose
 * merchant contains `keyword` (case-insensitive). Used by the rules engine when
 * a user creates a merchant→category rule. Returns the count updated.
 *
 * Lives here (not in rules.ts) so the TRANSACTIONS array stays encapsulated —
 * same pattern as adjustWalletBalance in wallets.ts. Category changes don't
 * affect wallet balances, so no balance adjustment is needed.
 */
export function applyMerchantRule(keyword: string, categoryId: string): number {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return 0;
  let count = 0;
  TRANSACTIONS = TRANSACTIONS.map((t) => {
    if (t.type === 'transfer_in' || t.type === 'transfer_out') return t;
    if (!t.merchant || !t.merchant.toLowerCase().includes(needle)) return t;
    if (t.categoryId === categoryId) return t;
    count += 1;
    return { ...t, categoryId, updatedAt: nowIso() };
  });
  return count;
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
  entryMethod: EntryMethod;
  externalId?: string | null;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  await delay();
  const tx: Transaction = {
    id: genTxId(),
    customerId: USER_ID,
    walletId: input.walletId,
    categoryId: input.categoryId,
    amount: input.amount,
    type: input.type,
    description: input.description,
    merchant: input.merchant,
    transactionDate: input.transactionDate,
    entryMethod: input.entryMethod,
    transferPairId: null,
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
  // Higher layers (transactions/[id] screen) prevent the user from changing those, but
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
    customerId: USER_ID,
    walletId: input.fromWalletId,
    categoryId: null,
    amount: input.amount,
    type: 'transfer_out',
    description: input.note ?? 'Chuyển tiền nội bộ',
    merchant: null,
    transactionDate: date,
    entryMethod: 'manual',
    transferPairId: pairId,
    externalId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  // Microsecond gap so the createdAt sort is stable: out leg comes first.
  await new Promise<void>((r) => setTimeout(r, 1));
  const inTx: Transaction = {
    id: genTxId(),
    customerId: USER_ID,
    walletId: input.toWalletId,
    categoryId: null,
    amount: input.amount,
    type: 'transfer_in',
    description: input.note ?? 'Nhận tiền nội bộ',
    merchant: null,
    transactionDate: date,
    entryMethod: 'manual',
    transferPairId: pairId,
    externalId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  TRANSACTIONS = [...TRANSACTIONS, outTx, inTx];
  adjustWalletBalance(outTx.walletId, balanceDelta(outTx));
  adjustWalletBalance(inTx.walletId, balanceDelta(inTx));
  return { outTx, inTx };
}
