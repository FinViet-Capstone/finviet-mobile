import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { DATA_EXPORT_STRINGS } from '@/data/settingsScreensData';

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

function buildSummary(from: Date, to: Date): string {
  const fromStr = formatDateVN(from);
  const toStr = formatDateVN(to);
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const approxTx = Math.round(days * 4);
  return `Khoảng: ${fromStr} – ${toStr} · ~${approxTx} giao dịch`;
}

export function DataExportScreen() {
  const [selected, setSelected] = useState<RangeChip>('custom');
  const range = getDateRange(selected);

  const handleExport = () => {
    Alert.alert(
      'Xuất dữ liệu',
      `Đang xuất file CSV từ ${formatDateVN(range.from)} đến ${formatDateVN(range.to)}…`,
      [{ text: 'OK' }],
    );
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
            <TouchableOpacity style={styles.dateButton} activeOpacity={0.7}>
              <Text style={styles.dateValue}>{formatDateVN(range.from)}</Text>
              <MaterialIcon name="calendar_month" size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* To */}
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>
              {DATA_EXPORT_STRINGS.labelTo.toUpperCase()}
            </Text>
            <TouchableOpacity style={styles.dateButton} activeOpacity={0.7}>
              <Text style={styles.dateValue}>{formatDateVN(range.to)}</Text>
              <MaterialIcon name="calendar_month" size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary line */}
        <View style={styles.summaryRow}>
          <MaterialIcon name="info" size={18} color={COLORS.primary} />
          <Text style={styles.summaryText}>{buildSummary(range.from, range.to)}</Text>
        </View>
      </ScrollView>

      {/* Fixed bottom action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <MaterialIcon name="download" size={20} color={COLORS.onPrimary} />
          <Text style={styles.exportButtonText}>{DATA_EXPORT_STRINGS.exportButton}</Text>
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
