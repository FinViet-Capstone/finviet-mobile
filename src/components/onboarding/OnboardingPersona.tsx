import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { DatePickerField } from '@/components/common/DatePickerField';
import { TextInput } from '@/components/common/TextInput';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

type Gender = 'male' | 'female' | 'other';

export interface OnboardingPersonaProps {
  readonly displayName: string;
  readonly gender: Gender | null;
  readonly dateOfBirth: string | null;
  readonly onChangeDisplayName: (v: string) => void;
  readonly onChangeGender: (g: Gender) => void;
  readonly onChangeDateOfBirth: (v: string) => void;
  readonly onNext: () => void;
}

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Nam' },
  { id: 'female', label: 'Nữ' },
  { id: 'other', label: 'Khác' },
];

const S = {
  title: 'Cho chúng tôi biết về bạn',
  subtitle: 'Thông tin này giúp chúng tôi cá nhân hóa các gợi ý tài chính cho riêng bạn.',
  nameLabel: 'Tên hiển thị',
  namePlaceholder: 'Nhập tên của bạn',
  genderLabel: 'Giới tính',
  dobLabel: 'Ngày sinh',
  dobPlaceholder: 'DD/MM/YYYY',
  next: 'Tiếp theo',
};

export function OnboardingPersona({
  displayName,
  gender,
  dateOfBirth,
  onChangeDisplayName,
  onChangeGender,
  onChangeDateOfBirth,
  onNext,
}: OnboardingPersonaProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Helper to display YYYY-MM-DD as DD/MM/YYYY
  const displayDob = dateOfBirth
    ? `${dateOfBirth.split('-')[2]}/${dateOfBirth.split('-')[1]}/${dateOfBirth.split('-')[0]}`
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Heading */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{S.title}</Text>
          <Text style={styles.subtitle}>{S.subtitle}</Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.nameLabel}</Text>
          <TextInput
            value={displayName}
            onChangeText={onChangeDisplayName}
            placeholder={S.namePlaceholder}
          />
        </View>

        {/* Gender segmented control */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.genderLabel}</Text>
          <View style={styles.segment}>
            {GENDERS.map((g) => {
              const active = gender === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={0.7}
                  style={[styles.segmentOption, active && styles.segmentOptionActive]}
                  onPress={() => onChangeGender(g.id)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date of birth */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.dobLabel}</Text>
          <DatePickerField
            value={dateOfBirth ?? ''}
            onChange={onChangeDateOfBirth}
            customTrigger={(openPicker) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.inputRow}
                onPress={openPicker}
              >
                <MaterialIcon name="calendar_today" size={20} color={colors.onSurfaceVariant} />
                <Text
                  style={[
                    styles.inputFlex,
                    !dateOfBirth && { color: withAlpha(colors.onSurfaceVariant, 0.5) }
                  ]}
                >
                  {displayDob || S.dobPlaceholder}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </ScrollView>

      {/* Next */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onNext} activeOpacity={0.9}>
          <Text style={styles.buttonText}>{S.next}</Text>
          <MaterialIcon name="arrow_forward" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING[4],
      paddingTop: SPACING[4],
      paddingBottom: SPACING[6],
      gap: SPACING[5],
    },
    headerSection: { gap: SPACING[2] },
    title: {
      fontSize: FONT_SIZE['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
    },
    subtitle: {
      fontSize: FONT_SIZE.base,
      color: colors.onSurfaceVariant,
      lineHeight: 24,
    },
    field: { gap: SPACING[2] },
    label: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurfaceVariant,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[3],
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: withAlpha(colors.outlineVariant, 0.3),
      borderRadius: BORDER_RADIUS.xl,
      paddingHorizontal: SPACING[4],
    },
    inputFlex: {
      flex: 1,
      paddingVertical: SPACING[4],
      fontSize: FONT_SIZE.base,
      color: colors.onSurface,
    },
    segment: {
      flexDirection: 'row',
      gap: SPACING[1],
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: withAlpha(colors.outlineVariant, 0.3),
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[1],
    },
    segmentOption: {
      flex: 1,
      paddingVertical: SPACING[3],
      alignItems: 'center',
      borderRadius: BORDER_RADIUS.lg,
    },
    segmentOptionActive: {
      backgroundColor: colors.surfaceBright,
      borderWidth: 1,
      borderColor: withAlpha(colors.outlineVariant, 0.5),
    },
    segmentText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurfaceVariant,
    },
    segmentTextActive: {
      color: colors.primary,
      fontWeight: FONT_WEIGHT.semibold,
    },
    buttonContainer: {
      paddingHorizontal: SPACING[4],
      paddingBottom: SPACING[6],
      paddingTop: SPACING[3],
    },
    button: {
      height: 56,
      flexDirection: 'row',
      gap: SPACING[2],
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.xl,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 6,
    },
    buttonText: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onPrimary,
    },
  });
}
