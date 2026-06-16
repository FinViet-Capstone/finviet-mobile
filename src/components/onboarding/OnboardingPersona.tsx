import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

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
  aiHint: 'Dựa trên độ tuổi & giới tính, FinViet sẽ đề xuất các danh mục phù hợp — bạn có thể đổi sau.',
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
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{S.title}</Text>
          <Text style={styles.subtitle}>{S.subtitle}</Text>
        </View>

        {/* AI highlight */}
        <View style={styles.aiBox}>
          <MaterialIcon name="auto_awesome" size={22} color={COLORS.primary} filled />
          <Text style={styles.aiText}>{S.aiHint}</Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.nameLabel}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={onChangeDisplayName}
            placeholder={S.namePlaceholder}
            placeholderTextColor={`${COLORS.onSurfaceVariant}80`}
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
          <View style={styles.inputRow}>
            <MaterialIcon name="calendar_today" size={20} color={COLORS.onSurfaceVariant} />
            <TextInput
              style={styles.inputFlex}
              value={dateOfBirth ?? ''}
              onChangeText={onChangeDateOfBirth}
              placeholder={S.dobPlaceholder}
              placeholderTextColor={`${COLORS.onSurfaceVariant}80`}
            />
          </View>
        </View>
      </ScrollView>

      {/* Next */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onNext} activeOpacity={0.9}>
          <Text style={styles.buttonText}>{S.next}</Text>
          <MaterialIcon name="arrow_forward" size={20} color={COLORS.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    color: COLORS.onSurface,
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
  aiBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: `${COLORS.primary}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}4D`,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
  },
  aiText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  field: { gap: SPACING[2] },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  input: {
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}4D`,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}4D`,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING[4],
  },
  inputFlex: {
    flex: 1,
    paddingVertical: SPACING[4],
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
  },
  segment: {
    flexDirection: 'row',
    gap: SPACING[1],
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}4D`,
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
    backgroundColor: COLORS.surfaceBright,
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}80`,
  },
  segmentText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
  },
  segmentTextActive: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
});
