import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';
import { AmountText } from '@/components/common/AmountText';
import { Transaction } from '@/types/transaction';

export interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

/**
 * Single transaction row displaying:
 *   [Category circle] | description + merchant | amount + date
 *
 * The category icon is rendered as a colored circle with the category's initial
 * letter because the icon set has not yet been decided (see categories.ts).
 */
export function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const category = transaction.categoryId
    ? getCategoryById(transaction.categoryId)
    : undefined;

  const categoryColor = category?.color ?? COLORS.gray[400];
  const categoryInitial = category?.nameVi?.charAt(0).toUpperCase() ?? '?';

  // Format transaction_date (YYYY-MM-DD) as DD/MM/YYYY for display
  const [year, month, day] = transaction.transactionDate.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const content = (
    <View style={styles.row}>
      {/* Category circle */}
      <View style={[styles.categoryCircle, { backgroundColor: categoryColor + '26' }]}>
        <Text style={[styles.categoryInitial, { color: categoryColor }]}>
          {categoryInitial}
        </Text>
      </View>

      {/* Middle: description + merchant */}
      <View style={styles.middle}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description ?? category?.nameVi ?? 'Giao dịch'}
        </Text>
        {transaction.merchant ? (
          <Text style={styles.merchant} numberOfLines={1}>
            {transaction.merchant}
          </Text>
        ) : null}
      </View>

      {/* Right: amount + date */}
      <View style={styles.right}>
        <AmountText
          amount={transaction.amount}
          type={transaction.type}
          size="sm"
        />
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[2],
    ...SHADOW.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  categoryInitial: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  middle: {
    flex: 1,
    marginRight: SPACING[2],
  },
  description: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[800],
  },
  merchant: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
    marginTop: 2,
  },
});
