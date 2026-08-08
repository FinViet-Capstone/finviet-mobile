import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DatePickerField } from '@/components/common/DatePickerField';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { DATA_EXPORT_STRINGS } from '@/data/settingsScreensData';
import { useTransactions } from '@/hooks';
import { useWallets } from '@/hooks/useWallets';
import { getCategoryById } from '@/constants/categories';
import type { Transaction, TransactionType } from '@/types';

const TYPE_VI: Record<TransactionType, string> = {
  expense: 'Chi tiêu',
  income: 'Thu nhập',
  transfer_out: 'Chuyển đi',
  transfer_in: 'Chuyển đến',
};

/** Quotes a field only when it needs it (contains a comma, quote, or newline). */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildCsv(transactions: Transaction[], walletNames: Map<string, string>): string {
  const header = ['Ngày', 'Loại', 'Ví', 'Danh mục', 'Mô tả', 'Số tiền (VND)'];
  const rows = transactions.map((t) => [
    t.transactionDate,
    TYPE_VI[t.type],
    walletNames.get(t.walletId) ?? 'Ví đã xóa',
    t.categoryId ? (getCategoryById(t.categoryId)?.nameVi ?? t.categoryId) : 'Chưa phân loại',
    t.merchant ?? t.description ?? '',
    String(t.amount),
  ]);
  return [header, ...rows].map((cols) => cols.map(csvField).join(',')).join('\r\n');
}

const EXPORT_DIR = new Directory(Paths.cache, 'exports');

type RangeChip = 'this_month' | '3_months' | 'this_year' | 'custom';

interface ChipOption {
  id: RangeChip;
  label: string;
}

const CHIPS: ChipOption[] = [
  { id: 'this_month', label: DATA_EXPORT_STRINGS.chipThisMonth },
  { id: '3_months', label: DATA_EXPORT_STRINGS.chip3Months },
  { id: 'this_year', label: DATA_EXPORT_STRINGS.chipThisYear },
  { id: 'custom', label: DATA_EXPORT_STRINGS.chipCustom },
];

function getDateRange(chip: RangeChip): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  let from = new Date(now);

  switch (chip) {
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3_months':
      from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case 'this_year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      from = new Date(now.getFullYear(), now.getMonth() - 2, 15);
      break;
  }
  return { from, to };
}

function formatDateVN(d: Date): string {
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildSummary(from: Date, to: Date, count: number): string {
  const fromStr = formatDateVN(from);
  const toStr = formatDateVN(to);
  return `Khoảng: ${fromStr} – ${toStr} · ${count} giao dịch`;
}

export function DataExportScreen() {
  const [selected, setSelected] = useState<RangeChip>('custom');
  const [isExporting, setIsExporting] = useState(false);

  // Custom date state (YYYY-MM-DD)
  const defaultCustom = getDateRange('custom');
  const [customFrom, setCustomFrom] = useState<string>(
    defaultCustom.from.toISOString().split('T')[0]
  );
  const [customTo, setCustomTo] = useState<string>(
    defaultCustom.to.toISOString().split('T')[0]
  );

  let range = getDateRange(selected);
  if (selected === 'custom') {
    range = {
      from: new Date(customFrom),
      to: new Date(customTo),
    };
  }

  const startDate = range.from.toISOString().split('T')[0];
  const endDate = range.to.toISOString().split('T')[0];
  const { data: txData } = useTransactions({ startDate, endDate });
  const transactions = (txData ?? []) as Transaction[];
  const { data: walletsData } = useWallets();
  const wallets = (walletsData as any)?.wallets ?? [];

  const handleExport = async () => {
    if (isExporting) return;
    if (transactions.length === 0) {
      Alert.alert(DATA_EXPORT_STRINGS.errorTitle, DATA_EXPORT_STRINGS.noData);
      return;
    }

    setIsExporting(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(DATA_EXPORT_STRINGS.errorTitle, DATA_EXPORT_STRINGS.sharingUnavailable);
        return;
      }

      const walletNames = new Map<string, string>(
        wallets.map((w: { id: string; name: string }) => [w.id, w.name]),
      );
      const csv = buildCsv(transactions, walletNames);

      if (!EXPORT_DIR.exists) EXPORT_DIR.create({ intermediates: true });
      const file = new File(EXPORT_DIR, `finviet_${startDate}_${endDate}.csv`);
      if (file.exists) file.delete();
      file.create();
      // Leading BOM so Excel opens the Vietnamese diacritics as UTF-8, not Latin-1.
      const BOM = String.fromCharCode(0xfeff);
      file.write(BOM + csv);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: DATA_EXPORT_STRINGS.shareDialogTitle,
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert(DATA_EXPORT_STRINGS.errorTitle, DATA_EXPORT_STRINGS.errorGeneric);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={styles.description}>{DATA_EXPORT_STRINGS.description}</Text>

        {/* Time range chips */}
        <View style={styles.chipsRow}>
          {CHIPS.map((chip) => {
            const isActive = chip.id === selected;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelected(chip.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date range card */}
        <View style={styles.dateCard}>
          {/* Subtle glow */}
          <View style={styles.cardGlow} pointerEvents="none" />

          {/* From */}
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>
              {DATA_EXPORT_STRINGS.labelFrom.toUpperCase()}
            </Text>
            <DatePickerField
              value={selected === 'custom' ? customFrom : range.from.toISOString().split('T')[0]}
              onChange={(iso) => {
                setCustomFrom(iso);
                setSelected('custom');
              }}
              customTrigger={(openPicker) => (
                <TouchableOpacity style={styles.dateButton} onPress={openPicker} activeOpacity={0.7}>
                  <Text style={styles.dateValue}>{formatDateVN(range.from)}</Text>
                  <MaterialIcon name="calendar_month" size={20} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            />
          </View>

          {/* To */}
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>
              {DATA_EXPORT_STRINGS.labelTo.toUpperCase()}
            </Text>
            <DatePickerField
              value={selected === 'custom' ? customTo : range.to.toISOString().split('T')[0]}
              onChange={(iso) => {
                setCustomTo(iso);
                setSelected('custom');
              }}
              customTrigger={(openPicker) => (
                <TouchableOpacity style={styles.dateButton} onPress={openPicker} activeOpacity={0.7}>
                  <Text style={styles.dateValue}>{formatDateVN(range.to)}</Text>
                  <MaterialIcon name="calendar_month" size={20} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        {/* Summary line */}
        <View style={styles.summaryRow}>
          <MaterialIcon name="info" size={18} color={COLORS.primary} />
          <Text style={styles.summaryText}>
            {buildSummary(range.from, range.to, transactions.length)}
          </Text>
        </View>
      </ScrollView>

      {/* Fixed bottom action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExport}
          activeOpacity={0.8}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
          ) : (
            <>
              <MaterialIcon name="download" size={20} color={COLORS.onPrimary} />
              <Text style={styles.exportButtonText}>{DATA_EXPORT_STRINGS.exportButton}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.exportNote}>{DATA_EXPORT_STRINGS.exportNote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: 140,
    gap: SPACING[6],
  },
  description: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
    maxWidth: 300,
    lineHeight: 24,
  },
  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  chipTextActive: {
    color: COLORS.onPrimary,
  },
  // Date card
  dateCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    gap: SPACING[4],
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -SPACING[8],
    right: -SPACING[8],
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: COLORS.primary + '0D',
  },
  dateField: { gap: SPACING[2] },
  dateLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minHeight: 48,
  },
  dateValue: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.primaryContainer + '1A',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.primaryContainer + '33',
  },
  summaryText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceContainer,
    paddingTop: SPACING[4],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerHighest,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    gap: SPACING[2],
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING[4],
    height: 56,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
  exportNote: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    paddingBottom: SPACING[2],
  },
});
