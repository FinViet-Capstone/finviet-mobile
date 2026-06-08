import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.walletModal}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{'Chọn ví'}</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* All wallets */}
          <TouchableOpacity
            style={[styles.walletOption, selectedWalletId === null && styles.walletOptionActive]}
            onPress={() => onSelect(null)}
            activeOpacity={0.75}
          >
            <View style={styles.walletIconWrap}>
              <MaterialIcon name="account_balance_wallet" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletName}>{'Tất cả ví'}</Text>
              <Text style={styles.walletBalance}>{formatVND(totalBalance)}</Text>
            </View>
            {selectedWalletId === null && (
              <MaterialIcon name="check_circle" size={20} color={COLORS.primary} />
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
                  color={w.type === 'linked' ? COLORS.secondary : COLORS.primary}
                />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletName}>{w.name}</Text>
                <Text style={styles.walletBalance}>{formatVND(w.balance)}</Text>
              </View>
              {selectedWalletId === w.id && (
                <MaterialIcon name="check_circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  walletModal: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    paddingBottom: SPACING[10],
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[4],
  },
  walletSectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
    paddingHorizontal: SPACING[2],
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: COLORS.surfaceContainer,
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING[2],
  },
  walletOptionActive: {
    backgroundColor: `${COLORS.primaryContainer}22`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
  },
  walletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
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
    color: COLORS.onSurface,
  },
  walletBalance: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
});
