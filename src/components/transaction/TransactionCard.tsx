import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { formatVNDCompact } from '@/utils/formatters';
import type { Transaction } from '@/types/transaction';

export interface TransactionCardProps {
  transaction: Transaction;
  /** Wallet display name, resolved by the caller (keeps this presentational). */
  walletName?: string;
  onPress?: () => void;
}

/**
 * Entry-method tag — shows HOW the transaction was captured.
 * manual → nothing; photo → camera icon; csv_import → sheet icon;
 * sms_paste → "sms" text; linked → link icon.
 */
function MethodTag({ method }: { method: Transaction['entryMethod'] }) {
  if (method === 'manual') return null;

  if (method === 'sms_paste') {
    return (
      <View style={styles.methodTag}>
        <Text style={styles.methodTagText}>{'SMS'}</Text>
      </View>
    );
  }

  const icon =
    method === 'photo' ? 'photo_camera'
    : method === 'csv_import' ? 'description'
    : 'link'; // linked

  return (
    <View style={styles.methodTag}>
      <MaterialIcon name={icon} size={11} color={COLORS.onSurfaceVariant} />
    </View>
  );
}

/**
 * Dense transaction list row (M3). Shows category icon, an entry-method tag
 * (how the tx was captured: photo / csv / sms / linked — manual shows none),
 * an amber left border + "classify now" hint when uncategorized, and the wallet
 * name. Income amounts are green with a + prefix; expenses are unsigned (per the
 * Transactions design).
 */
export function TransactionCard({ transaction: tx, walletName = '', onPress }: TransactionCardProps) {
  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
  const isIncome = tx.type === 'income';
  const isGoalContrib = tx.categoryId === 'cat_savings_goal';
  const category = !isTransfer && tx.categoryId ? getCategoryById(tx.categoryId) : undefined;
  // Transfer legs carry categoryId === null but are NOT uncategorized spend —
  // they get their own swap styling, never the amber "classify now" treatment.
  const isUncategorized = !isTransfer && !tx.categoryId;
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

  // Income / transfer-in are credits (+, green); transfer-out is a debit (−, neutral);
  // expenses stay unsigned per the Transactions design.
  const isCredit = isIncome || tx.type === 'transfer_in';
  const amountPrefix = isCredit ? '+' : tx.type === 'transfer_out' ? '−' : '';
  const amountColor = isCredit
    ? COLORS.tertiary
    : tx.type === 'transfer_out'
    ? COLORS.onSurfaceVariant
    : COLORS.onSurface;

  // Goal-contribution title: "Nạp mục tiêu: {name from description}"
  const goalName = isGoalContrib && tx.description
    ? tx.description.replace(/^Nạp mục tiêu:\s*/i, '')
    : null;

  const title = isTransfer
    ? tx.description || 'Chuyển quỹ'
    : isGoalContrib
    ? `Nạp mục tiêu: ${goalName ?? ''}`
    : tx.merchant ?? tx.description ?? (isUncategorized ? 'Chưa phân loại' : 'Giao dịch');
  const subtitle = isTransfer
    ? tx.type === 'transfer_out' ? 'Chuyển đi' : 'Nhận về'
    : isGoalContrib
    ? 'Tiết kiệm mục tiêu'
    : isUncategorized
    ? 'Phân loại ngay →'
    : (category?.nameVi ?? walletName);

  return (
    <TouchableOpacity
      style={[styles.txRow, isUncategorized && styles.txRowUncat]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
        <MaterialIcon name={iconName} size={20} color={iconColor} />
      </View>

      <View style={styles.txMeta}>
        <View style={styles.txTitleRow}>
          <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
          <MethodTag method={tx.entryMethod} />
        </View>
        <Text
          style={[styles.txSubtitle, isUncategorized && { color: COLORS.secondary }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {amountPrefix}{formatVNDCompact(tx.amount)}
        </Text>
        <Text style={styles.txWalletLabel} numberOfLines={1}>{walletName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.surfaceContainerLow,
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[2],
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING[3],
  },
  txRowUncat: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txMeta: {
    flex: 1,
    gap: 2,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  txTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  methodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
  },
  methodTagText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  txSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  txAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  txWalletLabel: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
    maxWidth: 80,
  },
});
