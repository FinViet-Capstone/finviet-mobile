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
import { Trophy } from 'lucide-react-native';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useGoals } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatVND } from '@/utils/formatters';
import type { SavingsGoalWithProgress } from '@/types';

export default function GoalsScreen() {
  const router = useRouter();
  const { data, isLoading } = useGoals();

  if (isLoading || !data) return <LoadingSpinner />;

  const visible = data.filter((g) => !g.isDeleted);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mục tiêu tiết kiệm</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Theo dõi tiến độ và đóng góp định kỳ vào các mục tiêu của bạn.
        </Text>

        {visible.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Chưa có mục tiêu"
            subtitle="Tạo mục tiêu đầu tiên để bắt đầu tiết kiệm có kế hoạch."
          />
        ) : (
          visible.map((goal) => <GoalCard key={goal.id} goal={goal} />)
        )}

        {/* Add new goal */}
        <TouchableOpacity
          style={styles.addCard}
          onPress={() =>
            router.push('/(tabs)/wallet/goals/new' as never)
          }
          activeOpacity={0.75}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addLabel}>Tạo mục tiêu mới</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalCard({ goal }: { goal: SavingsGoalWithProgress }) {
  const router = useRouter();
  const progress = Math.min(goal.progressPercentage / 100, 1);
  const color =
    goal.progressPercentage >= 100
      ? COLORS.success
      : goal.progressPercentage >= 70
      ? COLORS.brand[500]
      : COLORS.info;

  // Format deadline as DD/MM/YYYY
  const [y, m, d] = goal.deadline.split('-');
  const deadlineDisplay = `${d}/${m}/${y}`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/(tabs)/wallet/goals/${goal.id}` as never)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {goal.name}
        </Text>
        <Text style={styles.cardPct}>{goal.progressPercentage.toFixed(0)}%</Text>
      </View>

      <ProgressBar value={progress} color={color} />

      <View style={styles.cardBody}>
        <View>
          <Text style={styles.cardLabel}>Đã tiết kiệm</Text>
          <Text style={styles.cardAmount}>{formatVND(goal.currentAmount)}</Text>
        </View>
        <View style={styles.cardBodyRight}>
          <Text style={styles.cardLabel}>Mục tiêu</Text>
          <Text style={styles.cardTarget}>{formatVND(goal.targetAmount)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
          Còn {goal.monthsRemaining} tháng • Cần{' '}
          <Text style={styles.footerHighlight}>
            {formatVND(goal.requiredMonthlySaving)}/tháng
          </Text>
        </Text>
        <Text style={styles.footerDeadline}>Hạn: {deadlineDisplay}</Text>
      </View>
    </TouchableOpacity>
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

  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    lineHeight: 20,
    marginBottom: SPACING[4],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  cardTitle: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginRight: SPACING[2],
  },
  cardPct: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[3],
  },
  cardBodyRight: { alignItems: 'flex-end' },
  cardLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  cardAmount: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  cardTarget: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[700],
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
  footerText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[600],
  },
  footerHighlight: {
    color: COLORS.brand[600],
    fontWeight: FONT_WEIGHT.semibold,
  },
  footerDeadline: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
  },

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
    marginTop: SPACING[2],
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
});
