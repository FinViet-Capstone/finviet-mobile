import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useBudgets } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { BudgetProgressBar } from '@/components/budget/BudgetProgressBar';
import { formatVND } from '@/utils/formatters';

export default function BudgetListScreen() {
  const router = useRouter();
  const { data, isLoading } = useBudgets();

  if (isLoading) return <LoadingSpinner />;

  const budgets = data ?? [];
  const totalLimit = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgets.filter((b) => b.status === 'danger').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý ngân sách</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryLabel}>Tổng đã chi tháng này</Text>
            <Text style={styles.summarySpent}>{formatVND(totalSpent)}</Text>
            <Text style={styles.summaryLimit}>
              / {formatVND(totalLimit)} ngân sách
            </Text>
          </View>
          {overBudgetCount > 0 ? (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{overBudgetCount}</Text>
              <Text style={styles.alertBadgeLabel}>vượt mức</Text>
            </View>
          ) : null}
        </View>

        {/* Budget cards */}
        {budgets.length === 0 ? (
          <EmptyState
            icon="account_balance_wallet"
            title="Chưa có ngân sách"
            subtitle="Đặt giới hạn chi tiêu cho từng danh mục để theo dõi tốt hơn."
          />
        ) : (
          budgets.map((budget) => (
            <TouchableOpacity
              key={budget.id}
              style={styles.budgetCard}
              onPress={() =>
                router.push(`/(tabs)/more/budget/${budget.id}` as never)
              }
              activeOpacity={0.85}
            >
              <BudgetProgressBar budget={budget} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>
                  Còn lại{' '}
                  <Text style={styles.cardRemaining}>
                    {formatVND(Math.max(0, budget.remaining))}
                  </Text>
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addCard}
          onPress={() =>
            router.push('/(tabs)/more/budget/new' as never)
          }
          activeOpacity={0.75}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addLabel}>Thêm ngân sách</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Ngân sách được đặt lại vào ngày 1 hàng tháng. Bạn sẽ nhận thông báo khi đạt 80% giới hạn.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOW.lg,
  },
  summaryMain: { flex: 1 },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.brand[100] },
  summarySpent: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginVertical: SPACING[1],
  },
  summaryLimit: { fontSize: FONT_SIZE.xs, color: COLORS.brand[100] },
  alertBadge: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  alertBadgeText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  alertBadgeLabel: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.medium,
  },

  budgetCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  cardFooterText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[600],
  },
  cardRemaining: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  chevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.brand[200],
    borderStyle: 'dashed',
    backgroundColor: COLORS.white,
    gap: SPACING[2],
    marginTop: SPACING[1],
    marginBottom: SPACING[4],
  },
  addIcon: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  addLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.brand[500],
  },

  note: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    paddingHorizontal: SPACING[2],
  },
});
