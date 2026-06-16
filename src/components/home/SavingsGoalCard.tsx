import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { formatVND } from '@/utils/formatters';
import type { SavingsGoalWithProgress } from '@/types/goal';

export interface SavingsGoalCardProps {
  readonly goal: SavingsGoalWithProgress | null | undefined;
}

function daysUntil(deadlineIso: string): number {
  const now = new Date();
  const deadline = new Date(deadlineIso);
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
  const router = useRouter();

  if (!goal) return null;

  const days = daysUntil(goal.deadline);
  const pct = Math.min(100, goal.progressPercentage);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/budgets/goals/${goal.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mục tiêu tiết kiệm</Text>
        <View style={styles.deadlineBadge}>
          <MaterialIcon name="timer" size={13} color={COLORS.secondary} />
          <Text style={styles.deadlineText}>Còn {days} ngày</Text>
        </View>
      </View>

      <View style={styles.goalRow}>
        <View style={styles.iconWrapper}>
          <Text style={styles.iconEmoji}>
            {(goal as unknown as { iconEmoji?: string }).iconEmoji ?? '🎯'}
          </Text>
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as unknown as number }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressCurrent}>
            <Text style={styles.progressCurrentBold}>{formatVND(goal.currentAmount)}</Text>
            {' / '}{formatVND(goal.targetAmount)}
          </Text>
          <Text style={styles.progressPct}>{pct.toFixed(0)}% hoàn thành</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: `${COLORS.outline}1A`,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    backgroundColor: `${COLORS.secondaryContainer}33`,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}4D`,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },
  progressSection: {
    gap: SPACING[2],
  },
  progressTrack: {
    height: 10,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCurrent: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
  progressCurrentBold: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },
  progressPct: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
});
