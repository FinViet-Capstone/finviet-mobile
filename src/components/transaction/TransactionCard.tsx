import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOW } from '@/constants/theme';
import { getCategoryById } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { AmountText } from '@/components/common/AmountText';
import { Transaction } from '@/types/transaction';

export interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
  /** Renders a small chevron at the right edge to signal "tap for detail". */
  showChevron?: boolean;
}

export function TransactionCard({ transaction, onPress, showChevron = false }: TransactionCardProps) {
  const category = transaction.categoryId
    ? getCategoryById(transaction.categoryId)
    : undefined;

  const categoryColor = category?.color ?? COLORS.gray[400];
  const Icon = getCategoryIcon(category?.icon);

  const [year, month, day] = transaction.transactionDate.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const content = (
    <View style={styles.row}>
      <View style={[styles.categoryCircle, { backgroundColor: categoryColor + '26' }]}>
        <Icon size={20} color={categoryColor} />
      </View>

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

      <View style={styles.right}>
        <AmountText
          amount={transaction.amount}
          type={transaction.type}
          size="sm"
        />
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      {showChevron ? (
        <ChevronRight size={18} color={COLORS.gray[300]} style={styles.cardChevron} />
      ) : null}
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
  cardChevron: {
    marginLeft: SPACING[2],
  },
});
