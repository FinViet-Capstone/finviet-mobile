import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

export interface UncategorizedBannerProps {
  readonly count: number;
}

export function UncategorizedBanner({ count }: UncategorizedBannerProps) {
  const router = useRouter();

  if (count === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <View style={styles.iconWrapper}>
          <MaterialIcon name="category" size={18} color={COLORS.secondary} />
        </View>
        <Text style={styles.label}>{count} giao dịch chưa phân loại</Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/(tabs)/transactions')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>Phân loại</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: `${COLORS.secondaryContainer}F2`,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING[2] + 2,
    paddingHorizontal: SPACING[4],
    borderWidth: 1,
    borderColor: `${COLORS.secondary}66`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${COLORS.secondary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSecondaryContainer,
  },
  actionBtn: {
    backgroundColor: COLORS.onSecondaryContainer,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.secondaryContainer,
  },
});
