import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { formatVND } from '@/utils/formatters';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { CATEGORIES } from '@/constants/categories';
import type { Transaction } from '@/types';

export interface RecentTransactionsListProps {
  readonly transactions: Transaction[];
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const txDate = new Date(dateStr);
  const todayStr = today.toDateString();
  const yesterdayStr = new Date(today.getTime() - 86400000).toDateString();

  if (txDate.toDateString() === todayStr) return 'Hôm nay';
  if (txDate.toDateString() === yesterdayStr) return 'Hôm qua';

  return txDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

export function RecentTransactionsList({ transactions }: RecentTransactionsListProps) {
  const router = useRouter();

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/transactions')}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <MaterialIcon name="search" size={22} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {transactions.slice(0, 5).map((tx) => {
          const cat = CATEGORIES.find((c) => c.id === tx.categoryId);
          const iconName = cat ? getCategoryIcon(cat.icon) : 'receipt';
          const isIncome = tx.type === 'income';
          const amountColor = isIncome ? COLORS.tertiary : COLORS.onSurface;
          const iconBg = isIncome ? `${COLORS.tertiary}1A` : COLORS.surfaceContainerHigh;
          const iconColor = isIncome ? COLORS.tertiary : COLORS.outline;

          return (
            <TouchableOpacity
              key={tx.id}
              style={styles.txRow}
              onPress={() => router.push(`/(tabs)/transactions/${tx.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                <MaterialIcon name={iconName} size={20} color={iconColor} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle} numberOfLines={1}>
                  {tx.merchant ?? tx.description ?? 'Giao dịch'}
                </Text>
                <Text style={styles.txMeta}>
                  {cat?.nameVi ?? 'Chưa phân loại'} · {formatRelativeDate(tx.transactionDate)}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: amountColor }]}>
                {isIncome ? '+' : ''}{formatVND(tx.amount)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  list: {
    gap: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING[3],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  txMeta: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  txAmount: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
