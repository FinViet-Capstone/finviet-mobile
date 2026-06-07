import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { formatVND } from '@/utils/formatters';

const TICK_COUNT = 10;

interface BucketRow {
  label: string;
  spent: number;
  limit: number;
  activeColor: string;
}

export interface BudgetOverviewCardProps {
  readonly needsSpent: number;
  readonly needsLimit: number;
  readonly wantsSpent: number;
  readonly wantsLimit: number;
  readonly savingsSpent: number;
  readonly savingsLimit: number;
}

function EnergyBar({ spent, limit, activeColor }: { spent: number; limit: number; activeColor: string }) {
  const activeTicks = limit > 0 ? Math.min(TICK_COUNT, Math.round((spent / limit) * TICK_COUNT)) : 0;
  return (
    <View style={styles.tickRow}>
      {Array.from({ length: TICK_COUNT }, (_, i) => (
        <View
          key={i}
          style={[
            styles.tick,
            { backgroundColor: i < activeTicks ? activeColor : COLORS.surfaceContainerHighest },
          ]}
        />
      ))}
    </View>
  );
}

function BucketItem({ label, spent, limit, activeColor }: BucketRow) {
  return (
    <View style={styles.bucketItem}>
      <View style={styles.bucketHeader}>
        <Text style={styles.bucketLabel}>{label}</Text>
        <Text style={styles.bucketAmount}>
          <Text style={styles.bucketSpent}>{formatVND(spent)}</Text>
          <Text style={styles.bucketLimit}> / {formatVND(limit)}</Text>
        </Text>
      </View>
      <EnergyBar spent={spent} limit={limit} activeColor={activeColor} />
    </View>
  );
}

export function BudgetOverviewCard({
  needsSpent,
  needsLimit,
  wantsSpent,
  wantsLimit,
  savingsSpent,
  savingsLimit,
}: BudgetOverviewCardProps) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Ngân sách tháng này</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')} activeOpacity={0.7}>
          <Text style={styles.detailLink}>Chi tiết →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bucketList}>
        <BucketItem
          label="Thiết yếu"
          spent={needsSpent}
          limit={needsLimit}
          activeColor={COLORS.primary}
        />
        <BucketItem
          label="Mong muốn"
          spent={wantsSpent}
          limit={wantsLimit}
          activeColor={COLORS.secondary}
        />
        <BucketItem
          label="Tiết kiệm"
          spent={savingsSpent}
          limit={savingsLimit}
          activeColor={COLORS.tertiary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: `${COLORS.outline}1A`,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  detailLink: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  bucketList: {
    gap: SPACING[4],
  },
  bucketItem: {
    gap: SPACING[2],
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
  },
  bucketAmount: {
    fontSize: FONT_SIZE.sm,
  },
  bucketSpent: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  bucketLimit: {
    color: COLORS.onSurfaceVariant,
  },
  tickRow: {
    flexDirection: 'row',
    height: 10,
    gap: 2,
  },
  tick: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
});
