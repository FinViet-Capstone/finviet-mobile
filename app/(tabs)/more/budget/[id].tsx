import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useBudgetById, useTransactions, useDeleteBudget } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { formatVND } from '@/utils/formatters';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function BudgetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: budget, isLoading } = useBudgetById(id);
  const deleteMutation = useDeleteBudget();

  // Pull current month transactions filtered by category
  const today = new Date();
  const monthStart = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd = ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const { data: txs } = useTransactions({
    startDate: monthStart,
    endDate: monthEnd,
    categoryId: budget?.categoryId,
  });

  const expenseTxs = useMemo(
    () => (txs ?? []).filter((t) => t.type === 'expense'),
    [txs],
  );

  if (isLoading) return <LoadingSpinner />;
  if (!budget) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Không tìm thấy" />
        <EmptyState
          icon="account_balance_wallet"
          title="Không tìm thấy ngân sách"
          subtitle="Ngân sách này có thể đã bị xóa."
        />
      </SafeAreaView>
    );
  }

  const progress = Math.min(budget.percentage / 100, 1);
  const statusColor =
    budget.status === 'danger'
      ? COLORS.budget.danger
      : budget.status === 'warning'
      ? COLORS.budget.warning
      : COLORS.budget.safe;

  const statusLabel =
    budget.status === 'danger'
      ? 'Vượt ngân sách'
      : budget.status === 'warning'
      ? 'Sắp hết ngân sách'
      : 'Trong ngân sách';

  const handleDelete = () => {
    if (!budget) return;
    Alert.alert(
      'Xóa ngân sách?',
      `Xóa ngân sách "${budget.categoryName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(budget.id, {
              onSuccess: () =>
                Alert.alert('Đã xóa', 'Ngân sách đã được xóa.', [
                  { text: 'OK', onPress: () => router.back() },
                ]),
              onError: () => Alert.alert('Lỗi', 'Không xóa được ngân sách.'),
            }),
        },
      ],
    );
  };

  const handleEdit = () => {
    if (!budget) return;
    router.push(`/(tabs)/more/budget/edit?id=${budget.id}` as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title={budget.categoryName} onEdit={handleEdit} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View
            style={[styles.heroDot, { backgroundColor: budget.categoryColor }]}
          />
          <Text style={styles.heroSpent}>{formatVND(budget.spent)}</Text>
          <Text style={styles.heroLimit}>/ {formatVND(budget.monthlyLimit)}</Text>

          <View style={styles.heroProgress}>
            <ProgressBar value={progress} color={statusColor} height={10} />
            <View style={styles.heroStats}>
              <Text style={[styles.heroPct, { color: statusColor }]}>
                {budget.percentage.toFixed(1)}%
              </Text>
              <Text style={[styles.heroStatus, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat
            label="Đã chi"
            value={formatVND(budget.spent)}
            color={statusColor}
          />
          <Stat
            label={budget.remaining >= 0 ? 'Còn lại' : 'Vượt'}
            value={formatVND(Math.abs(budget.remaining))}
            color={
              budget.remaining >= 0 ? COLORS.success : COLORS.danger
            }
          />
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Giao dịch ({expenseTxs.length})
          </Text>
          {expenseTxs.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="Chưa có giao dịch"
              subtitle="Giao dịch trong tháng sẽ xuất hiện ở đây."
            />
          ) : (
            expenseTxs.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onPress={() =>
                  router.push(
                    `/(tabs)/transactions/edit-entry?id=${tx.id}` as never,
                  )
                }
              />
            ))
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title="Xóa ngân sách"
            variant="ghost"
            onPress={handleDelete}
            loading={deleteMutation.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  onBack,
  title,
  onEdit,
}: {
  onBack: () => void;
  title: string;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {onEdit ? (
        <TouchableOpacity style={styles.headerBtn} onPress={onEdit}>
          <Text style={styles.headerEdit}>Sửa</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

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
  headerEdit: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.semibold,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  hero: {
    margin: SPACING[5],
    padding: SPACING[5],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    alignItems: 'center',
    ...SHADOW.md,
  },
  heroDot: { width: 16, height: 16, borderRadius: 8, marginBottom: SPACING[2] },
  heroSpent: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  heroLimit: { fontSize: FONT_SIZE.sm, color: COLORS.gray[500], marginTop: 2 },
  heroProgress: { alignSelf: 'stretch', marginTop: SPACING[4] },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[2],
  },
  heroPct: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  heroStatus: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    gap: SPACING[3],
    marginBottom: SPACING[5],
  },
  statCard: {
    flex: 1,
    padding: SPACING[4],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOW.sm,
  },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },
  statValue: {
    marginTop: 4,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },

  section: {
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },

  actions: { paddingHorizontal: SPACING[5] },
});
