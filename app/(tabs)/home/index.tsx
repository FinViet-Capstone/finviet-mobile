import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import {
  useWallets,
  useTransactions,
  useRecentTransactions,
  useSpendingScore,
  useBudgets,
  useGoals,
  useUser,
} from '@/hooks';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SpendingScoreCard } from '@/components/home/SpendingScoreCard';
import { TotalBalanceCard } from '@/components/home/TotalBalanceCard';
import { BudgetOverviewCard } from '@/components/home/BudgetOverviewCard';
import { SavingsGoalCard } from '@/components/home/SavingsGoalCard';
import { RecentTransactionsList } from '@/components/home/RecentTransactionsList';
import { UncategorizedBanner } from '@/components/home/UncategorizedBanner';
import { ChatbotFAB } from '@/components/home/ChatbotFAB';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORIES } from '@/constants/categories';
import type { SavingsGoalWithProgress } from '@/types/goal';

const UNCATEGORIZED_WARNING_THRESHOLD = 0.2;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const NEEDS_CATEGORY_IDS = ['cat_food', 'cat_transport', 'cat_health', 'cat_education', 'cat_housing', 'cat_family'];
const WANTS_CATEGORY_IDS = ['cat_entertain', 'cat_beauty', 'cat_bills', 'cat_shopping'];
const SAVINGS_CATEGORY_IDS = ['cat_savings'];

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: user } = useUser();
  const { data: walletData, isLoading: walletsLoading } = useWallets();
  const { data: score } = useSpendingScore();
  const { data: budgets } = useBudgets();
  const { data: goals } = useGoals();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { data: monthTx } = useTransactions({
    startDate: ymd(monthStart),
    endDate: ymd(monthEnd),
  });
  const { data: recentTx } = useRecentTransactions(5);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const walletNames = useMemo(
    () => (walletData?.wallets ?? []).map((w) => w.name).slice(0, 3),
    [walletData],
  );

  const { needsSpent, wantsSpent, savingsSpent } = useMemo(() => {
    const expTx = (monthTx ?? []).filter((t) => t.type === 'expense' && t.categoryId !== null);
    const needs = expTx
      .filter((t) => NEEDS_CATEGORY_IDS.includes(t.categoryId!))
      .reduce((s, t) => s + t.amount, 0);
    const wants = expTx
      .filter((t) => WANTS_CATEGORY_IDS.includes(t.categoryId!))
      .reduce((s, t) => s + t.amount, 0);
    const savings = expTx
      .filter((t) => SAVINGS_CATEGORY_IDS.includes(t.categoryId!))
      .reduce((s, t) => s + t.amount, 0);
    return { needsSpent: needs, wantsSpent: wants, savingsSpent: savings };
  }, [monthTx]);

  const { needsLimit, wantsLimit, savingsLimit } = useMemo(() => {
    const budgetList = budgets ?? [];
    const sumLimit = (ids: string[]) =>
      budgetList
        .filter((b) => ids.includes(b.categoryId))
        .reduce((s, b) => s + b.monthlyLimit, 0);
    return {
      needsLimit: sumLimit(NEEDS_CATEGORY_IDS),
      wantsLimit: sumLimit(WANTS_CATEGORY_IDS),
      savingsLimit: sumLimit(SAVINGS_CATEGORY_IDS),
    };
  }, [budgets]);

  const topGoal = useMemo((): SavingsGoalWithProgress | null => {
    const activeGoals = (goals ?? []).filter((g) => !g.isCompleted && !g.isDeleted);
    if (activeGoals.length === 0) return null;
    return activeGoals.sort((a, b) => {
      const daysA = new Date(a.deadline).getTime() - Date.now();
      const daysB = new Date(b.deadline).getTime() - Date.now();
      return daysA - daysB;
    })[0];
  }, [goals]);

  const uncategorizedCount = useMemo(() => {
    const allTx = monthTx ?? [];
    const expenses = allTx.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return 0;
    const uncategorized = expenses.filter((t) => t.categoryId === null).length;
    if (uncategorized / expenses.length < UNCATEGORIZED_WARNING_THRESHOLD) return 0;
    return uncategorized;
  }, [monthTx]);

  const displayName = user?.displayName?.split(' ').slice(-1)[0] ?? 'bạn';

  if (walletsLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={() => router.push('/settings')}
          activeOpacity={0.8}
        >
          <View style={styles.avatarPlaceholder}>
            <MaterialIcon name="person" size={20} color={COLORS.onSurfaceVariant} />
          </View>
        </TouchableOpacity>
        <Text style={styles.greeting}>Xin chào, {displayName} 👋</Text>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/notifications')}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <MaterialIcon name="notifications" size={22} color={COLORS.outline} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <SpendingScoreCard score={score} />

        <TotalBalanceCard
          totalBalance={walletData?.totalBalance ?? 0}
          walletNames={walletNames}
          isHidden={balanceHidden}
          onToggleHide={() => setBalanceHidden((v) => !v)}
        />

        <BudgetOverviewCard
          needsSpent={needsSpent}
          needsLimit={needsLimit}
          wantsSpent={wantsSpent}
          wantsLimit={wantsLimit}
          savingsSpent={savingsSpent}
          savingsLimit={savingsLimit}
        />

        <SavingsGoalCard goal={topGoal} />

        <RecentTransactionsList transactions={recentTx ?? []} />

        <UncategorizedBanner count={uncategorizedCount} />

        <View style={styles.fabSpacer} />
      </ScrollView>

      <ChatbotFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: `${COLORS.background}CC`,
  },
  avatarWrapper: {
    marginRight: SPACING[3],
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: `${COLORS.outline}4D`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[8],
    gap: SPACING[4],
  },
  fabSpacer: {
    height: 70,
  },
});
