import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { TransactionType } from '@/types/transaction';
import { formatVND } from '@/utils/formatters';


export interface AmountTextProps {
  /** Raw number in VND — always positive; sign is derived from `type` */
  amount: number;
  /**
   * Transaction type used to determine color and sign prefix.
   * - income / transfer_in → green, prefixed with +
   * - expense / transfer_out → red, prefixed with −
   * - undefined → neutral gray, no prefix
   */
  type?: TransactionType;
  size?: keyof typeof FONT_SIZE;
  style?: TextStyle;
}

export function AmountText({ amount, type, size = 'base', style }: AmountTextProps) {
  const isIncome = type === 'income' || type === 'transfer_in';
  const isExpense = type === 'expense' || type === 'transfer_out';

  const color = isIncome
    ? COLORS.success
    : isExpense
    ? COLORS.danger
    : COLORS.gray[700];

  const prefix = isIncome ? '+' : isExpense ? '−' : '';

  return (
    <Text style={[styles.base, { color, fontSize: FONT_SIZE[size] }, style]}>
      {prefix}{formatVND(amount)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: FONT_WEIGHT.semibold,
  },
});
