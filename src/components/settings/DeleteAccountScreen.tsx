import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { TextInput } from '@/components/common/TextInput';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { DELETE_ACCOUNT_STRINGS } from '@/data/settingsScreensData';
import { useAuthStore } from '@/stores/authStore';
import { useDeleteAccount } from '@/hooks';

interface DeleteAccountScreenProps {
  onCancel?: () => void;
  onDeleted?: () => void;
}

export function DeleteAccountScreen({ onCancel, onDeleted }: DeleteAccountScreenProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const customer = useAuthStore((s) => s.customer);
  const userEmail = customer?.email ?? '';
  const deleteAccount = useDeleteAccount();

  const [inputEmail, setInputEmail] = useState('');
  const [focused, setFocused] = useState(false);

  const isConfirmed = inputEmail.trim().toLowerCase() === userEmail.toLowerCase();
  const canDelete = isConfirmed && !deleteAccount.isPending;

  const handleDelete = () => {
    if (!canDelete) return;
    Alert.alert(
      'Xác nhận xóa tài khoản',
      'Bạn có chắc chắn muốn xóa tài khoản vĩnh viễn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              onDeleted?.();
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại.');
            }
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
            <MaterialIcon name="warning" size={32} color={colors.error} />
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
                color={colors.onSurfaceVariant}
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
            borderColor={isConfirmed ? colors.tertiary : focused ? colors.error : undefined}
            value={inputEmail}
            onChangeText={setInputEmail}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={DELETE_ACCOUNT_STRINGS.confirmPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </ScrollView>

      {/* Fixed bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={!canDelete}
          activeOpacity={canDelete ? 0.8 : 1}
        >
          <Text style={[styles.deleteButtonText, !canDelete && styles.deleteButtonTextDisabled]}>
            {deleteAccount.isPending ? 'Đang xóa...' : DELETE_ACCOUNT_STRINGS.deleteButton}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
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
    backgroundColor: withAlpha(colors.errorContainer, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.error,
    textAlign: 'center',
  },
  warningBody: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Data loss card
  dataLostCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[2],
  },
  dataLostTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
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
    color: colors.onSurface,
    flex: 1,
  },
  // Confirm field
  confirmSection: {
    gap: SPACING[2],
  },
  confirmLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  confirmEmail: {
    color: colors.onSurface,
    fontWeight: FONT_WEIGHT.bold,
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
    borderTopColor: colors.surfaceVariant,
    backgroundColor: colors.surfaceContainerLowest,
    gap: SPACING[2],
  },
  deleteButton: {
    width: '100%',
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButtonDisabled: {
    backgroundColor: withAlpha(colors.error, 0.5),
  },
  deleteButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onError,
  },
  deleteButtonTextDisabled: {
    color: withAlpha(colors.onError, 0.5),
  },
  cancelButton: {
    width: '100%',
    paddingVertical: SPACING[4],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.transparent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  });
}
