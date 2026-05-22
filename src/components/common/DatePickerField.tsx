/**
 * DatePickerField -- reusable date input.
 *
 * Tap to open the platform-native picker. iOS opens a modal sheet with a spinner
 * and a Done button; Android opens the system dialog. Both close themselves and
 * call onChange(YYYY-MM-DD).
 *
 * Renders in the same "select row" style as the other field rows in the app
 * so it drops in next to existing TextInput/picker rows without restyling.
 *
 *   <DatePickerField
 *     label="Ngày"
 *     value="2026-05-22"
 *     onChange={(iso) => ...}
 *   />
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { Button } from './Button';

export interface DatePickerFieldProps {
  /** YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  /** Optional label rendered above the field. */
  label?: string;
  /** Inclusive lower bound (YYYY-MM-DD). */
  minDate?: string;
  /** Inclusive upper bound (YYYY-MM-DD). */
  maxDate?: string;
  disabled?: boolean;
  /** Render an "uncategorized-orange" border when true (used by photo/sms uncertain UX). */
  uncertain?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDisplay(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePickerField({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  disabled,
  uncertain,
}: DatePickerFieldProps) {
  const [iosVisible, setIosVisible] = useState(false);
  // iOS spinner needs a draft so the user can scroll without committing on every tick.
  const [iosDraft, setIosDraft] = useState<Date>(() => isoToDate(value));

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS === 'ios') {
      setIosDraft(isoToDate(value));
      setIosVisible(true);
      return;
    }
    // Android: imperative API. We render a one-shot picker by setting state,
    // but the simpler path is the inline conditional below.
    setAndroidVisible(true);
  };

  const [androidVisible, setAndroidVisible] = useState(false);

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setAndroidVisible(false);
    if (event.type === 'set' && selected) {
      onChange(dateToIso(selected));
    }
  };

  const handleIosConfirm = () => {
    setIosVisible(false);
    onChange(dateToIso(iosDraft));
  };

  const handleIosCancel = () => setIosVisible(false);

  const minimumDate = minDate ? isoToDate(minDate) : undefined;
  const maximumDate = maxDate ? isoToDate(maxDate) : undefined;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[
          styles.row,
          uncertain && styles.rowUncertain,
          disabled && styles.rowDisabled,
        ]}
        onPress={openPicker}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <Text style={[styles.value, disabled && styles.valueDisabled]}>
          {isoToDisplay(value)}
        </Text>
        {uncertain ? (
          <Text style={styles.uncertainBadge}>?</Text>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </TouchableOpacity>

      {/* Android one-shot dialog */}
      {Platform.OS === 'android' && androidVisible ? (
        <DateTimePicker
          value={isoToDate(value)}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {/* iOS modal with spinner + Done */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={iosVisible}
          transparent
          animationType="slide"
          onRequestClose={handleIosCancel}
        >
          <TouchableOpacity
            style={styles.iosOverlay}
            activeOpacity={1}
            onPress={handleIosCancel}
          >
            <TouchableOpacity activeOpacity={1} style={styles.iosSheet}>
              <View style={styles.iosHandle} />
              <Text style={styles.iosTitle}>{label ?? 'Chọn ngày'}</Text>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="spinner"
                onChange={(_e, selected) => {
                  if (selected) setIosDraft(selected);
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant="light"
                locale="vi-VN"
                style={styles.iosPicker}
              />
              <View style={styles.iosActions}>
                <Button
                  title="Hủy"
                  variant="ghost"
                  onPress={handleIosCancel}
                  style={styles.iosBtn}
                />
                <Button
                  title="Xong"
                  onPress={handleIosConfirm}
                  style={styles.iosBtn}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {},
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    minHeight: 48,
    backgroundColor: COLORS.white,
  },
  rowUncertain: {
    borderColor: COLORS.calendar.uncategorized,
    borderWidth: 2,
  },
  rowDisabled: {
    backgroundColor: COLORS.gray[100],
  },
  value: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
  },
  valueDisabled: {
    color: COLORS.gray[500],
  },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.gray[400],
    marginLeft: SPACING[2],
  },
  uncertainBadge: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.calendar.uncategorized,
    marginLeft: SPACING[2],
  },

  // iOS modal
  iosOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    ...SHADOW.lg,
  },
  iosHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray[300],
    marginBottom: SPACING[3],
  },
  iosTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
  iosActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[3],
  },
  iosBtn: {
    flex: 1,
  },
});
