import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';
import type { Wallet } from '@/types';

export interface WalletPickerSheetProps {
  visible: boolean;
  wallets: Wallet[];
  /** null = "Tất cả ví" (all wallets) is selected. */
  selectedWalletId: string | null;
  totalBalance: number;
  onSelect: (walletId: string | null) => void;
  onClose: () => void;
}

/** Bottom-sheet wallet filter: "Tất cả ví" + the user's wallets. */
export function WalletPickerSheet({
  visible,
  wallets,
  selectedWalletId,
  totalBalance,
  onSelect,
  onClose,
}: WalletPickerSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.modalTitle}>{'Chọn ví'}</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* All wallets */}
          <TouchableOpacity
            style={[styles.walletOption, selectedWalletId === null && styles.walletOptionActive]}
            onPress={() => onSelect(null)}
            activeOpacity={0.75}
          >
            <View style={styles.walletIconWrap}>
              <MaterialIcon name="account_balance_wallet" size={20} color={colors.primary} />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletName}>{'Tất cả ví'}</Text>
              <Text style={styles.walletBalance}>{formatVND(totalBalance)}</Text>
            </View>
            {selectedWalletId === null && (
              <MaterialIcon name="check_circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <Text style={styles.walletSectionLabel}>{'VÍ CỦA TÔI'}</Text>

          {wallets.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.walletOption, selectedWalletId === w.id && styles.walletOptionActive]}
              onPress={() => onSelect(w.id)}
              activeOpacity={0.75}
            >
              <View style={styles.walletIconWrap}>
                <MaterialIcon
                  name={w.type === 'linked' ? 'link' : 'account_balance_wallet'}
                  size={20}
                  color={w.type === 'linked' ? colors.secondary : colors.primary}
                />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletName}>{w.name}</Text>
                <Text style={styles.walletBalance}>{formatVND(w.balance)}</Text>
              </View>
              {selectedWalletId === w.id && (
                <MaterialIcon name="check_circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </DraggableSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: SPACING[5],
      paddingBottom: SPACING[10],
    },
    modalTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
      marginBottom: SPACING[4],
    },
    walletSectionLabel: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurfaceVariant,
      letterSpacing: 0.8,
      marginTop: SPACING[3],
      marginBottom: SPACING[2],
      paddingHorizontal: SPACING[2],
    },
    walletOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[3],
      backgroundColor: colors.surfaceContainer,
      padding: SPACING[4],
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING[2],
    },
    walletOptionActive: {
      backgroundColor: withAlpha(colors.primaryContainer, 0.13),
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.27),
    },
    walletIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    walletInfo: {
      flex: 1,
      gap: 2,
    },
    walletName: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurface,
    },
    walletBalance: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
    },
  });
}
