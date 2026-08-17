import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';
import type { SavingsGoalWithProgress } from '@/types/goal';

export interface SavingsGoalCardProps {
  readonly goal: SavingsGoalWithProgress | null | undefined;
}

function daysUntil(deadlineIso: string | null): number | null {
  if (!deadlineIso) return null;
  const now = new Date();
  const deadline = new Date(deadlineIso);
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          <MaterialIcon name="timer" size={13} color={colors.secondary} />
          <Text style={styles.deadlineText}>
            {days === null ? 'Không có thời hạn' : `Còn ${days} ngày`}
          </Text>
        </View>
      </View>

      <View style={styles.goalRow}>
        <View style={styles.iconWrapper}>
          <Text style={styles.iconEmoji}>
            {goal.iconEmoji ?? '🎯'}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: withAlpha(colors.outline, 0.1),
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
    color: colors.onSurface,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    backgroundColor: withAlpha(colors.secondaryContainer, 0.2),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: withAlpha(colors.secondary, 0.3),
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.secondary,
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
    backgroundColor: withAlpha(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.2),
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
    color: colors.onSurface,
  },
  progressSection: {
    gap: SPACING[2],
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCurrent: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
  },
  progressCurrentBold: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
  },
  progressPct: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
  },
  });
}
