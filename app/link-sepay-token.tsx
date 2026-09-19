/**
 * link-sepay-token.tsx — Link SePay production or an isolated Sandbox demo account.
 *
 * Accepts an API token from my.sepay.vn → API Access. Sandbox is enabled by default for
 * project demonstrations and uses only SePay Test mode data. No OAuth flow is needed:
 *   1. User pastes their SePay API token.
 *   2. We send it to the dedicated Sandbox route or the production link-token route.
 *   3. Backend validates it, creates a sepay_linked wallet, and imports transactions.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { TextInput } from '@/components/common/TextInput';
import { useLinkSepayWithToken } from '@/hooks/useWallets';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { API_BASE_URL } from '@/lib/env';
import { getApiErrorMessage } from '@/utils/errors';
import { SepaySandboxUnavailableError } from '@/services/real/sepay';

const S = {
  title: 'Liên kết SePay',
  heading: 'Nhập API token SePay',
  sandboxLabel: 'Chế độ demo Sandbox',
  sandboxDescription: 'Dùng tài khoản và giao dịch giả lập, không cần liên kết ngân hàng thật.',
  sandboxHint: 'Tại my.sepay.vn, bật Test mode → API Access → sao chép đầy đủ token. Giữ chế độ demo Sandbox bên dưới bật khi liên kết.',
  productionHint: 'Lấy token Production tại my.sepay.vn → Cấu hình Công ty → API Access. Token này truy cập dữ liệu ngân hàng thật đã liên kết.',
  noBackendError: 'Chưa cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_BASE_URL trống). Tính năng liên kết SePay cần một máy chủ .NET đang chạy.',
  tokenLabel: 'API Token',
  tokenPlaceholder: 'Dán token của bạn vào đây',
  accountLabel: 'Số tài khoản (không bắt buộc)',
  accountPlaceholder: 'Để trống nếu chỉ có 1 tài khoản',
  linkBtn: 'Liên kết & Đồng bộ',
  linking: 'Đang liên kết...',
  successTitle: 'Liên kết thành công!',
  errorTitle: 'Liên kết thất bại',
  retry: 'Thử lại',
  done: 'Xong',
  linkError: 'Không thể liên kết tài khoản SePay.',
};

type Phase = 'input' | 'linking' | 'success' | 'error';

export default function LinkSepayTokenScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const linkMutation = useLinkSepayWithToken();

  const [token, setToken] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [sandbox, setSandbox] = useState(true);
  const [phase, setPhase] = useState<Phase>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncCount, setSyncCount] = useState(0);

  const handleLink = useCallback(() => {
    const trimmed = token.trim();
    if (!trimmed) return;

    // Fail fast with a clear reason instead of letting a request against an
    // empty baseURL surface as a cryptic network error.
    if (!API_BASE_URL) {
      setErrorMessage(S.noBackendError);
      setPhase('error');
      return;
    }

    setPhase('linking');

    linkMutation.mutate(
      { apiToken: trimmed, accountNumber: accountNumber.trim() || undefined, sandbox },
      {
        onSuccess: (result) => {
          setSyncCount(result.transactionsSynced);
          setPhase('success');
        },
        onError: (err: unknown) => {
          // The backend explains *why* in the error envelope's `message`; Axios's own
          // err.message is only "Request failed with status code 400".
          setErrorMessage(err instanceof SepaySandboxUnavailableError
            ? err.message
            : getApiErrorMessage(err, S.linkError));
          setPhase('error');
        },
      },
    );
  }, [token, accountNumber, sandbox, linkMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialIcon name="arrow_back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {phase === 'input' || phase === 'linking' ? (
            <>
              <View style={styles.iconWrap}>
                <MaterialIcon name="account_balance" size={48} color={colors.primary} />
              </View>
              <Text style={styles.heading}>{S.heading}</Text>
              <Text style={styles.hint}>{sandbox ? S.sandboxHint : S.productionHint}</Text>

              <View style={styles.sandboxRow}>
                <View style={styles.sandboxCopy}>
                  <Text style={styles.sandboxLabel}>{S.sandboxLabel}</Text>
                  <Text style={styles.sandboxDescription}>{S.sandboxDescription}</Text>
                </View>
                <Switch
                  value={sandbox}
                  onValueChange={setSandbox}
                  disabled={phase !== 'input'}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primaryContainer }}
                  thumbColor={sandbox ? colors.primary : colors.outline}
                  accessibilityLabel={S.sandboxLabel}
                />
              </View>

              <Text style={styles.fieldLabel}>{S.tokenLabel}</Text>
              <TextInput
                variant="multiline"
                value={token}
                onChangeText={setToken}
                placeholder={S.tokenPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                editable={phase === 'input'}
              />

              <Text style={styles.fieldLabel}>{S.accountLabel}</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder={S.accountPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                editable={phase === 'input'}
              />

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.primaryBtn, (!token.trim() || phase === 'linking') && styles.primaryBtnDisabled]}
                onPress={handleLink}
                disabled={!token.trim() || phase === 'linking'}
              >
                {phase === 'linking' ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <MaterialIcon name="link" size={18} color={colors.onPrimary} />
                )}
                <Text style={styles.primaryBtnText}>
                  {phase === 'linking' ? S.linking : S.linkBtn}
                </Text>
              </TouchableOpacity>
            </>
          ) : phase === 'success' ? (
            <View style={styles.statusWrap}>
              <MaterialIcon name="check_circle" size={64} color={colors.tertiary} />
              <Text style={styles.statusTitle}>{S.successTitle}</Text>
              <Text style={styles.statusSubtitle}>
                Đã đồng bộ {syncCount} giao dịch {sandbox ? 'giả lập từ Sandbox' : 'từ ngân hàng của bạn'}.
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.primaryBtn}
                onPress={() => router.replace('/(tabs)/wallets')}
              >
                <Text style={styles.primaryBtnText}>{S.done}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statusWrap}>
              <MaterialIcon name="error" size={64} color={colors.error} />
              <Text style={styles.statusTitle}>{S.errorTitle}</Text>
              <Text style={styles.statusSubtitle}>{errorMessage}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.primaryBtn}
                onPress={() => setPhase('input')}
              >
                <Text style={styles.primaryBtnText}>{S.retry}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
      color: colors.primary, textAlign: 'center',
    },
    content: { padding: SPACING[5], gap: SPACING[3] },
    iconWrap: { alignItems: 'center', marginBottom: SPACING[2] },
    heading: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, textAlign: 'center' },
    hint: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: SPACING[2] },
    sandboxRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
      padding: SPACING[4], borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surfaceContainer,
    },
    sandboxCopy: { flex: 1, gap: SPACING[1] },
    sandboxLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
    sandboxDescription: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, lineHeight: 18 },
    fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING[2] },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2],
      backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.lg,
      // paddingHorizontal matters in the success/error phases: statusWrap centers its
      // children, so the button shrinks to its content instead of filling the width.
      paddingVertical: SPACING[4], paddingHorizontal: SPACING[6], marginTop: SPACING[4],
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onPrimary },
    statusWrap: { alignItems: 'center', gap: SPACING[3], paddingVertical: SPACING[10] },
    statusTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface, textAlign: 'center' },
    statusSubtitle: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  });
}
