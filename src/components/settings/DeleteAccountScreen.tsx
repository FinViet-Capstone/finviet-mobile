import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { DELETE_ACCOUNT_STRINGS } from '@/data/settingsScreensData';
import { useAuthStore } from '@/stores/authStore';

interface DeleteAccountScreenProps {
  onCancel?: () => void;
  onDeleted?: () => void;
}

export function DeleteAccountScreen({ onCancel, onDeleted }: DeleteAccountScreenProps) {
  const customer = useAuthStore((s) => s.customer);
  const userEmail = customer?.email ?? '';

  const [inputEmail, setInputEmail] = useState('');
  const [focused, setFocused] = useState(false);

  const isConfirmed = inputEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDelete = () => {
    if (!isConfirmed) return;
    Alert.alert(
      'Xác nhận xóa tài khoản',
      'Bạn có chắc chắn muốn xóa tài khoản vĩnh viễn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: () => {
            // Mock: would call DELETE /customers/me in Phase 5
            onDeleted?.();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Warning hero */}
        <View style={styles.warningHero}>
          <View style={styles.warningIconCircle}>
            <MaterialIcon name="warning" size={32} color={COLORS.error} />
          </View>
          <Text style={styles.warningTitle}>{DELETE_ACCOUNT_STRINGS.warningTitle}</Text>
          <Text style={styles.warningBody}>{DELETE_ACCOUNT_STRINGS.warningBody}</Text>
        </View>

        {/* Data loss list */}
        <View style={styles.dataLostCard}>
          <Text style={styles.dataLostTitle}>{DELETE_ACCOUNT_STRINGS.dataLostTitle}</Text>
          {DELETE_ACCOUNT_STRINGS.dataItems.map((item, i) => (
            <View key={i} style={styles.dataItem}>
              <MaterialIcon
                name={DELETE_ACCOUNT_STRINGS.dataIcons[i]}
                size={20}
                color={COLORS.onSurfaceVariant}
              />
              <Text style={styles.dataItemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Email confirmation field */}
        <View style={styles.confirmSection}>
          <Text style={styles.confirmLabel}>
            {DELETE_ACCOUNT_STRINGS.confirmLabel}{' '}
            <Text style={styles.confirmEmail}>{userEmail}</Text>
          </Text>
          <TextInput
            style={[
              styles.emailInput,
              focused && styles.emailInputFocused,
              isConfirmed && styles.emailInputValid,
            ]}
            value={inputEmail}
            onChangeText={setInputEmail}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={DELETE_ACCOUNT_STRINGS.confirmPlaceholder}
            placeholderTextColor={COLORS.outline}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </ScrollView>

      {/* Fixed bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.deleteButton, !isConfirmed && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={!isConfirmed}
          activeOpacity={isConfirmed ? 0.8 : 1}
        >
          <Text style={[styles.deleteButtonText, !isConfirmed && styles.deleteButtonTextDisabled]}>
            {DELETE_ACCOUNT_STRINGS.deleteButton}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>{DELETE_ACCOUNT_STRINGS.cancelButton}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: 160,
    gap: SPACING[8],
  },
  // Warning hero
  warningHero: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    marginBottom: SPACING[4],
    gap: SPACING[4],
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.errorContainer + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
    textAlign: 'center',
  },
  warningBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Data loss card
  dataLostCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[2],
  },
  dataLostTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    marginBottom: SPACING[2],
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[4],
    minHeight: 32,
  },
  dataItemText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
    flex: 1,
  },
  // Confirm field
  confirmSection: {
    gap: SPACING[2],
  },
  confirmLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  confirmEmail: {
    color: COLORS.onSurface,
    fontWeight: FONT_WEIGHT.bold,
  },
  emailInput: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    minHeight: 48,
  },
  emailInputFocused: {
    borderColor: COLORS.error,
  },
  emailInputValid: {
    borderColor: COLORS.tertiary,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
    backgroundColor: COLORS.surfaceContainerLowest,
    gap: SPACING[2],
  },
  deleteButton: {
    width: '100%',
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButtonDisabled: {
    backgroundColor: COLORS.error + '80',
  },
  deleteButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onError,
  },
  deleteButtonTextDisabled: {
    color: COLORS.onError + '80',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.transparent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
});
