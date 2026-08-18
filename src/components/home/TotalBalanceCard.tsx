import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';

export interface TotalBalanceCardProps {
  readonly totalBalance: number;
  readonly walletNames: string[];
  readonly isHidden: boolean;
  readonly onToggleHide: () => void;
}

export function TotalBalanceCard({
  totalBalance,
  walletNames,
  isHidden,
  onToggleHide,
}: TotalBalanceCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>TỔNG SỐ DƯ</Text>
        <TouchableOpacity onPress={onToggleHide} activeOpacity={0.7} hitSlop={8}>
          <MaterialIcon
            name={isHidden ? 'visibility_off' : 'visibility'}
            size={18}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.amount}>
        {isHidden ? '••••••••đ' : formatVND(totalBalance)}
      </Text>

      {walletNames.length > 0 && (
        <Text style={styles.walletNames} numberOfLines={1}>
          {walletNames.join(' · ')}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: SPACING[4],
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[2],
      marginBottom: SPACING[2],
    },
    label: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurfaceVariant,
      letterSpacing: 1.2,
    },
    amount: {
      fontSize: 32,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
      letterSpacing: -0.5,
      marginBottom: SPACING[1],
    },
    walletNames: {
      fontSize: FONT_SIZE.sm,
      color: colors.outline,
      marginTop: SPACING[1],
    },
  });
}
