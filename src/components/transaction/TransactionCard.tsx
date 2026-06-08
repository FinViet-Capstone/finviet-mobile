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
 * Dense transaction list row (M3). Shows category icon, an AI badge for
 * un-overridden AI suggestions, an amber left border + "classify now" hint when
 * uncategorized, and the wallet name. Income amounts are green with a + prefix;
 * expenses are unsigned (per the Transactions design).
 */
export function TransactionCard({ transaction: tx, walletName = '', onPress }: TransactionCardProps) {
  const category = tx.categoryId ? getCategoryById(tx.categoryId) : undefined;
  const iconName = getCategoryIcon(category?.icon);
  const catColor = category?.color ?? COLORS.outlineVariant;
  const isUncategorized = !tx.categoryId;
  const isIncome = tx.type === 'income';

  return (
    <TouchableOpacity
      style={[styles.txRow, isUncategorized && styles.txRowUncat]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.txIcon, { backgroundColor: `${catColor}26` }]}>
        <MaterialIcon
          name={isUncategorized ? 'help_outline' : iconName}
          size={20}
          color={isUncategorized ? COLORS.secondary : catColor}
        />
      </View>

      <View style={styles.txMeta}>
        <View style={styles.txTitleRow}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {tx.merchant ?? tx.description ?? (isUncategorized ? 'Chưa phân loại' : 'Giao dịch')}
          </Text>
          {tx.aiSuggestedCategoryId && !tx.aiOverridden && (
            <View style={styles.aiBadge}>
              <MaterialIcon name="auto_awesome" size={10} color={COLORS.primary} />
              <Text style={styles.aiBadgeText}>{'AI'}</Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.txSubtitle, isUncategorized && { color: COLORS.secondary }]}
          numberOfLines={1}
        >
          {isUncategorized ? 'Phân loại ngay →' : (category?.nameVi ?? walletName)}
        </Text>
      </View>

      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isIncome ? COLORS.tertiary : COLORS.onSurface }]}>
          {isIncome ? `+${formatVNDCompact(tx.amount)}` : formatVNDCompact(tx.amount)}
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
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${COLORS.primaryContainer}33`,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
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
