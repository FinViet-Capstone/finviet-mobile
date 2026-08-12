import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
import { formatVNDCompact } from '@/utils/formatters';
import type { Transaction } from '@/types/transaction';
import { getTransactionCardVisuals } from './transactionCardVisuals';

export interface TransactionCardProps {
  transaction: Transaction;
  /** Wallet display name, resolved by the caller (keeps this presentational). */
  walletName?: string;
  /**
   * Takes the transaction so callers can pass a stable useCallback reference
   * (e.g. `onPress={handleTxPress}`) instead of a per-row inline closure —
   * required for React.memo below to actually skip re-renders.
   */
  onPress?: (transaction: Transaction) => void;
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
export const TransactionCard = React.memo(function TransactionCard({
  transaction: tx,
  walletName = '',
  onPress,
}: TransactionCardProps) {
  const {
    iconName,
    iconColor,
    iconBg,
    amountPrefix,
    amountColor,
    title,
    subtitle,
    isUncategorized,
  } = getTransactionCardVisuals(tx, walletName);

  return (
    <TouchableOpacity
      style={[styles.txRow, isUncategorized && styles.txRowUncat]}
      onPress={() => onPress?.(tx)}
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
});

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
