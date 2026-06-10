import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { NumericKeypad } from '@/components/common/NumericKeypad';
import { DraggableSheet } from '@/components/common/DraggableSheet';
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
  const [amountRaw, setAmountRaw] = useState(
    existingLimit ? String(existingLimit) : '',
  );

  const parsedAmount = parseInt(amountRaw || '0', 10);
  const amountDisplay = parsedAmount > 0 ? parsedAmount.toLocaleString('vi-VN') + 'đ' : '';

  const scopeOptions: ScopeOption[] = [
    { id: null, name: S.allWallets, hint: S.allWalletsHint },
    ...(wallets as Wallet[]).map((w) => ({
      id: w.id,
      name: w.name,
      hint: w.type === 'linked' ? 'Ví liên kết' : 'Ví cơ bản',
    })),
  ];

  const handleNumberPress = useCallback((key: string) => {
    setAmountRaw((prev) => {
      if (key === '000') return prev === '' ? '' : prev + '000';
      return prev + key;
    });
  }, []);

  const handleBackspace = useCallback(() => setAmountRaw((prev) => prev.slice(0, -1)), []);
  const handleClear = useCallback(() => setAmountRaw(''), []);

  const handleSave = useCallback(async () => {
    if (!parsedAmount) return;
    await createBudget.mutateAsync({ categoryId, monthlyLimit: parsedAmount });
    onClose();
  }, [parsedAmount, categoryId, createBudget, onClose]);

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
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
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

        {/* Amount — tappable display */}
        <Text style={styles.sectionLabel}>{S.amountLabel}</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amountText, !amountDisplay && styles.amountPlaceholder]}>
            {amountDisplay || S.amountPlaceholder}
          </Text>
          <Text style={styles.amountSuffix}>₫{S.monthly}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{S.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.saveBtn, (!amountRaw || createBudget.isPending) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!amountRaw || createBudget.isPending}
          >
            {createBudget.isPending ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.saveText}>{S.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <NumericKeypad
        onNumberPress={handleNumberPress}
        onBackspace={handleBackspace}
        onClear={handleClear}
        onDone={onClose}
      />
    </DraggableSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
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
    marginBottom: SPACING[4],
    height: 56,
  },
  amountText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  amountPlaceholder: {
    color: COLORS.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.normal,
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
