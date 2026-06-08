import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { useWallets } from '@/hooks/useWallets';
import { useCreateBudget } from '@/hooks/useBudgets';
import type { Wallet } from '@/types/wallet';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Đặt hạn mức',
  subtitle: 'Áp dụng cho',
  allWallets: 'Tất cả ví',
  allWalletsHint: 'Giới hạn tổng cho tất cả ví',
  amountLabel: 'Hạn mức hàng tháng',
  amountPlaceholder: 'Nhập số tiền',
  save: 'Lưu',
  cancel: 'Huỷ',
  monthly: '/ tháng',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  categoryId: string;
  categoryName: string;
  existingLimit?: number;
  onClose: () => void;
}

type ScopeOption = { id: string | null; name: string; hint: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

function parseAmount(formatted: string): number {
  return parseInt(formatted.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetLimitSheet({
  visible,
  categoryId,
  categoryName,
  existingLimit,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { data: wallets = [] } = useWallets();
  const createBudget = useCreateBudget();

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState(
    existingLimit ? formatAmount(String(existingLimit)) : '',
  );

  const scopeOptions: ScopeOption[] = [
    { id: null, name: S.allWallets, hint: S.allWalletsHint },
    ...(wallets as Wallet[]).map((w) => ({
      id: w.id,
      name: w.name,
      hint: w.type === 'linked' ? 'Ví liên kết' : 'Ví cơ bản',
    })),
  ];

  const handleAmountChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    setAmountText(digits ? Number(digits).toLocaleString('vi-VN') : '');
  }, []);

  const handleSave = useCallback(async () => {
    const amount = parseAmount(amountText);
    if (!amount) return;
    await createBudget.mutateAsync({ categoryId, monthlyLimit: amount });
    onClose();
  }, [amountText, categoryId, createBudget, onClose]);

  const renderScope = useCallback(
    ({ item }: { item: ScopeOption }) => {
      const active = item.id === selectedWalletId;
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.scopeRow, active && styles.scopeRowActive]}
          onPress={() => setSelectedWalletId(item.id)}
        >
          <MaterialIcon
            name={item.id === null ? 'account_balance_wallet' : 'wallet'}
            size={20}
            color={active ? COLORS.primary : COLORS.onSurfaceVariant}
          />
          <View style={styles.scopeText}>
            <Text style={[styles.scopeName, active && styles.scopeNameActive]}>
              {item.name}
            </Text>
            <Text style={styles.scopeHint}>{item.hint}</Text>
          </View>
          {active && (
            <MaterialIcon name="check_circle" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedWalletId],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING[4] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{S.title}</Text>
            <Text style={styles.categoryName}>{categoryName}</Text>
          </View>

          {/* Scope picker */}
          <Text style={styles.sectionLabel}>{S.subtitle}</Text>
          <FlatList
            data={scopeOptions}
            keyExtractor={(item) => item.id ?? 'all'}
            renderItem={renderScope}
            scrollEnabled={false}
            style={styles.scopeList}
          />

          {/* Amount input */}
          <Text style={styles.sectionLabel}>{S.amountLabel}</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={amountText}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder={S.amountPlaceholder}
              placeholderTextColor={COLORS.onSurfaceVariant}
              autoFocus
            />
            <Text style={styles.amountSuffix}>₫{S.monthly}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cancelBtn}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.saveBtn,
                (!amountText || createBudget.isPending) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!amountText || createBudget.isPending}
            >
              {createBudget.isPending ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.saveText}>{S.save}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: `${COLORS.black}80`,
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  header: {
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },
  categoryName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    marginTop: SPACING[1],
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  scopeList: {
    marginBottom: SPACING[4],
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainer,
    marginBottom: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  scopeRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  scopeText: {
    flex: 1,
  },
  scopeName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
  },
  scopeNameActive: {
    color: COLORS.primary,
  },
  scopeHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[6],
    height: 56,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    height: '100%',
  },
  amountSuffix: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    marginLeft: SPACING[2],
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  saveBtn: {
    flex: 2,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onPrimary,
  },
});
