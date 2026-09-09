import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BudgetDonut } from '@/components/budget/BudgetDonut';
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

      <View
        style={styles.goalRow}
        accessibilityRole="text"
        accessibilityLabel={`${goal.name}: ${pct.toFixed(0)}% hoàn thành, ${formatVND(goal.currentAmount)} trên ${formatVND(goal.targetAmount)}`}
      >
        <BudgetDonut
          percentage={pct}
          color={colors.primary}
          trackColor={colors.surfaceContainerHighest}
          size={92}
          strokeWidth={9}
          labelColor={colors.primary}
          labelSize={FONT_SIZE.lg}
          caption="hoàn thành"
          captionColor={colors.onSurfaceVariant}
          captionSize={FONT_SIZE.xs - 2}
        />
        <View style={styles.goalInfo}>
          <View style={styles.goalNameRow}>
            <View style={styles.iconWrapper}>
              <Text style={styles.iconEmoji}>
                {goal.iconEmoji ?? '🎯'}
              </Text>
            </View>
            <Text style={styles.goalName} numberOfLines={2}>{goal.name}</Text>
          </View>
          <Text style={styles.progressCurrent}>
            <Text style={styles.progressCurrentBold}>{formatVND(goal.currentAmount)}</Text>
            {' / '}{formatVND(goal.targetAmount)}
          </Text>
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
    gap: SPACING[4],
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: withAlpha(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  goalInfo: {
    flex: 1,
    gap: SPACING[2],
  },
  goalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  goalName: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
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
  });
}
