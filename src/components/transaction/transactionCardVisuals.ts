/**
 * Pure display-derivation for <TransactionCard>.
 *
 * A transaction row's icon, colours, amount sign and title/subtitle all branch
 * on the same handful of "kinds" (transfer leg / income / goal-contribution /
 * uncategorized spend / normal expense). Keeping that cascade here — out of the
 * component body — keeps the component simple and lets the branching be unit
 * tested directly. Behaviour is identical to the previous inline logic.
 */
import { COLORS } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import type { Transaction } from '@/types/transaction';

type Category = ReturnType<typeof getCategoryById>;

export interface TransactionCardVisuals {
  iconName: string;
  iconColor: string;
  iconBg: string;
  amountPrefix: string;
  amountColor: string;
  title: string;
  subtitle: string;
  /** Drives the amber left border + subtitle colour on uncategorized spend. */
  isUncategorized: boolean;
}

function resolveIcon(
  isTransfer: boolean,
  isGoalContrib: boolean,
  isUncategorized: boolean,
  category: Category,
): Pick<TransactionCardVisuals, 'iconName' | 'iconColor' | 'iconBg'> {
  const catColor = category?.color ?? COLORS.outlineVariant;
  const iconName = isTransfer
    ? 'swap_horiz'
    : isGoalContrib
    ? 'savings'
    : isUncategorized
    ? 'help_outline'
    : getCategoryIcon(category?.icon);
  const iconColor = isTransfer
    ? COLORS.onSurfaceVariant
    : isGoalContrib
    ? COLORS.tertiary
    : isUncategorized
    ? COLORS.secondary
    : catColor;
  const iconBg = isTransfer
    ? `${COLORS.onSurfaceVariant}26`
    : isGoalContrib
    ? `${COLORS.tertiary}26`
    : `${catColor}26`;
  return { iconName, iconColor, iconBg };
}

function resolveAmount(
  tx: Transaction,
  isIncome: boolean,
): Pick<TransactionCardVisuals, 'amountPrefix' | 'amountColor'> {
  // Income / transfer-in are credits (+, green); transfer-out is a debit (−,
  // neutral); expenses stay unsigned per the Transactions design.
  const isCredit = isIncome || tx.type === 'transfer_in';
  const amountPrefix = isCredit ? '+' : tx.type === 'transfer_out' ? '−' : '';
  const amountColor = isCredit
    ? COLORS.tertiary
    : tx.type === 'transfer_out'
    ? COLORS.onSurfaceVariant
    : COLORS.onSurface;
  return { amountPrefix, amountColor };
}

function resolveText(
  tx: Transaction,
  isTransfer: boolean,
  isGoalContrib: boolean,
  isUncategorized: boolean,
  category: Category,
  walletName: string,
): Pick<TransactionCardVisuals, 'title' | 'subtitle'> {
  const isGoalWithdrawal = isGoalContrib && tx.type === 'income';
  const goalName =
    isGoalContrib && tx.description
      ? tx.description.replace(/^(?:Nạp|Rút) mục tiêu:\s*/i, '')
      : null;

  const title = isTransfer
    ? tx.description || 'Chuyển quỹ'
    : isGoalContrib
    ? `${isGoalWithdrawal ? 'Rút' : 'Nạp'} mục tiêu: ${goalName ?? ''}`
    : tx.merchant ?? tx.description ?? (isUncategorized ? 'Chưa phân loại' : 'Giao dịch');
  const subtitle = isTransfer
    ? tx.type === 'transfer_out'
      ? 'Chuyển đi'
      : 'Nhận về'
    : isGoalWithdrawal
    ? 'Rút tiền mục tiêu'
    : isGoalContrib
    ? 'Tiết kiệm mục tiêu'
    : isUncategorized
    ? 'Phân loại ngay →'
    : category?.nameVi ?? walletName;
  return { title, subtitle };
}

export function getTransactionCardVisuals(
  tx: Transaction,
  walletName = '',
): TransactionCardVisuals {
  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
  const isIncome = tx.type === 'income';
  const isGoalContrib = tx.categoryId === 'cat_savings_goal';
  const category = !isTransfer && tx.categoryId ? getCategoryById(tx.categoryId) : undefined;
  // Transfer legs carry categoryId === null but are NOT uncategorized spend —
  // they get their own swap styling, never the amber "classify now" treatment.
  const isUncategorized = !isTransfer && !tx.categoryId;

  return {
    ...resolveIcon(isTransfer, isGoalContrib, isUncategorized, category),
    ...resolveAmount(tx, isIncome),
    ...resolveText(tx, isTransfer, isGoalContrib, isUncategorized, category, walletName),
    isUncategorized,
  };
}
