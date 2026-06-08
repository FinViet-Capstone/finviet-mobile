import React, { useEffect, useMemo, useState } from 'react';
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
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

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
import { AIChatbotSheet } from '@/components/home/AIChatbotSheet';
import type { SavingsGoalWithProgress } from '@/types/goal';

const UNCATEGORIZED_WARNING_THRESHOLD = 0.2;
// Approximate pill height — matches UncategorizedBanner bubble paddingVertical*2 + iconWrapper height
const BANNER_H = 52;

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
  const tabBarHeight = useBottomTabBarHeight();

  const [balanceHidden, setBalanceHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);

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

  // ── Banner animation ────────────────────────────────────────────────────────
  const bannerOpacity = useSharedValue(0);
  const bannerTranslateY = useSharedValue(BANNER_H);

  const animatedBannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerTranslateY.value }],
  }));

  // ── Derived data ────────────────────────────────────────────────────────────
  const walletNames = useMemo(
    () => (walletData?.wallets ?? []).map((w) => w.name).slice(0, 3),
    [walletData],
  );

  const { needsSpent, wantsSpent, savingsSpent } = useMemo(() => {
    const expTx = (monthTx ?? []).filter((t) => t.type === 'expense' && t.categoryId !== null);
    return {
      needsSpent: expTx.filter((t) => NEEDS_CATEGORY_IDS.includes(t.categoryId!)).reduce((s, t) => s + t.amount, 0),
      wantsSpent: expTx.filter((t) => WANTS_CATEGORY_IDS.includes(t.categoryId!)).reduce((s, t) => s + t.amount, 0),
      savingsSpent: expTx.filter((t) => SAVINGS_CATEGORY_IDS.includes(t.categoryId!)).reduce((s, t) => s + t.amount, 0),
    };
  }, [monthTx]);

  const { needsLimit, wantsLimit, savingsLimit } = useMemo(() => {
    const budgetList = budgets ?? [];
    const sumLimit = (ids: string[]) =>
      budgetList.filter((b) => ids.includes(b.categoryId)).reduce((s, b) => s + b.monthlyLimit, 0);
    return {
      needsLimit: sumLimit(NEEDS_CATEGORY_IDS),
      wantsLimit: sumLimit(WANTS_CATEGORY_IDS),
      savingsLimit: sumLimit(SAVINGS_CATEGORY_IDS),
    };
  }, [budgets]);

  const topGoal = useMemo((): SavingsGoalWithProgress | null => {
    const activeGoals = (goals ?? []).filter((g) => !g.isCompleted && !g.isDeleted);
    if (activeGoals.length === 0) return null;
    return activeGoals.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
  }, [goals]);

  const uncategorizedCount = useMemo(() => {
    const expenses = (monthTx ?? []).filter((t) => t.type === 'expense');
    if (expenses.length === 0) return 0;
    const uncategorized = expenses.filter((t) => t.categoryId === null).length;
    if (uncategorized / expenses.length < UNCATEGORIZED_WARNING_THRESHOLD) return 0;
    return uncategorized;
  }, [monthTx]);

  // Animate banner in when count becomes non-zero
  useEffect(() => {
    if (uncategorizedCount > 0) {
      bannerOpacity.value = withTiming(1, { duration: 200 });
      bannerTranslateY.value = withTiming(0, { duration: 250 });
    } else {
      bannerOpacity.value = 0;
      bannerTranslateY.value = BANNER_H;
    }
  }, [uncategorizedCount]);

  // FAB offset: clears banner when visible
  const fabExtraOffset = tabBarHeight + SPACING[4] + (uncategorizedCount > 0 ? BANNER_H + SPACING[2] : 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const displayName = user?.displayName?.split(' ').slice(-1)[0] ?? 'bạn';

  if (walletsLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          // Extra clearance so last card stays above FAB + banner
          { paddingBottom: tabBarHeight + BANNER_H + 56 + SPACING[4] },
        ]}
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
      </ScrollView>

      {/* ── Fixed bottom: banner (slides in from below) ─────────────────────── */}
      {uncategorizedCount > 0 && (
        <Animated.View
          style={[
            styles.bannerContainer,
            { bottom: tabBarHeight },
            animatedBannerStyle,
          ]}
        >
          <UncategorizedBanner count={uncategorizedCount} />
        </Animated.View>
      )}

      {/* ── Fixed bottom: chatbot FAB (floats above banner) ────────────────── */}
      <ChatbotFAB extraBottomOffset={fabExtraOffset} onOpen={() => setAdvisorOpen(true)} />

      <AIChatbotSheet visible={advisorOpen} onClose={() => setAdvisorOpen(false)} />
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
    gap: SPACING[4],
  },
  bannerContainer: {
    position: 'absolute',
    left: SPACING[4],
    right: SPACING[4],
  },
});
