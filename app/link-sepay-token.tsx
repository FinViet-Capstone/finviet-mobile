/**
 * link-sepay-token.tsx — Link a bank account with a personal SePay User API token.
 *
 * For users who already have a SePay account connected to their bank and a personal
 * API token (my.sepay.vn → API Access / Cấu hình API). No OAuth flow needed:
 *   1. User pastes their SePay API token.
 *   2. We send it to POST /wallets/sepay/link-token.
 *   3. Backend validates it, creates a sepay_linked wallet, and imports transactions.
 */

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { TextInput } from '@/components/common/TextInput';
import { useLinkSepayWithToken } from '@/hooks/useWallets';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { USE_MOCK, API_BASE_URL } from '@/lib/env';
import { getApiErrorMessage } from '@/utils/errors';

const S = {
  title: 'Liên kết SePay',
  heading: 'Nhập API token SePay',
  hint: 'Lấy token tại my.sepay.vn → Công ty → Cấu hình API (API Access). Token dùng để đồng bộ giao dịch từ tài khoản ngân hàng đã kết nối.',
  mockWarning: 'Liên kết SePay luôn gọi máy chủ thật, kể cả khi ứng dụng đang ở chế độ dữ liệu mẫu (mock) — cần một máy chủ .NET đang chạy để dùng tính năng này.',
  noBackendError: 'Chưa cấu hình địa chỉ máy chủ thật (EXPO_PUBLIC_API_BASE_URL trống). Tính năng liên kết SePay cần một máy chủ .NET đang chạy — không thể dùng ở chế độ dữ liệu mẫu.',
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
  const linkMutation = useLinkSepayWithToken();

  const [token, setToken] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncCount, setSyncCount] = useState(0);

  const handleLink = useCallback(() => {
    const trimmed = token.trim();
    if (!trimmed) return;

    // SePay's OAuth2/token linking always hits the real backend — it bypasses
    // USE_MOCK entirely (an OAuth flow can't be meaningfully mocked). Fail fast
    // with a clear reason instead of letting a request against an empty
    // baseURL surface as a cryptic network error.
    if (!API_BASE_URL) {
      setErrorMessage(S.noBackendError);
      setPhase('error');
      return;
    }

    setPhase('linking');

    linkMutation.mutate(
      { apiToken: trimmed, accountNumber: accountNumber.trim() || undefined },
      {
        onSuccess: (result) => {
          setSyncCount(result.transactionsSynced);
          setPhase('success');
        },
        onError: (err: unknown) => {
          // The backend explains *why* in the error envelope's `message`; Axios's own
          // err.message is only "Request failed with status code 400".
          setErrorMessage(getApiErrorMessage(err, S.linkError));
          setPhase('error');
        },
      },
    );
  }, [token, accountNumber, linkMutation]);

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
          <MaterialIcon name="arrow_back" size={22} color={COLORS.primary} />
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
                <MaterialIcon name="account_balance" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.heading}>{S.heading}</Text>
              <Text style={styles.hint}>{S.hint}</Text>

              {USE_MOCK && (
                <View style={styles.mockWarningBox}>
                  <MaterialIcon name="info" size={16} color={COLORS.secondary} />
                  <Text style={styles.mockWarningText}>{S.mockWarning}</Text>
                </View>
              )}

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
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                ) : (
                  <MaterialIcon name="link" size={18} color={COLORS.onPrimary} />
                )}
                <Text style={styles.primaryBtnText}>
                  {phase === 'linking' ? S.linking : S.linkBtn}
                </Text>
              </TouchableOpacity>
            </>
          ) : phase === 'success' ? (
            <View style={styles.statusWrap}>
              <MaterialIcon name="check_circle" size={64} color={COLORS.tertiary} />
              <Text style={styles.statusTitle}>{S.successTitle}</Text>
              <Text style={styles.statusSubtitle}>
                Đã đồng bộ {syncCount} giao dịch từ ngân hàng của bạn.
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
              <MaterialIcon name="error" size={64} color={COLORS.error} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary, textAlign: 'center',
  },
  content: { padding: SPACING[5], gap: SPACING[3] },
  iconWrap: { alignItems: 'center', marginBottom: SPACING[2] },
  heading: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, textAlign: 'center' },
  hint: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: SPACING[2] },
  mockWarningBox: {
    flexDirection: 'row', gap: SPACING[2], alignItems: 'flex-start',
    backgroundColor: `${COLORS.secondary}15`, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: `${COLORS.secondary}30`,
    padding: SPACING[3], marginBottom: SPACING[2],
  },
  mockWarningText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.secondary, lineHeight: 16 },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING[2] },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2],
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    // paddingHorizontal matters in the success/error phases: statusWrap centers its
    // children, so the button shrinks to its content instead of filling the width.
    paddingVertical: SPACING[4], paddingHorizontal: SPACING[6], marginTop: SPACING[4],
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onPrimary },
  statusWrap: { alignItems: 'center', gap: SPACING[3], paddingVertical: SPACING[10] },
  statusTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface, textAlign: 'center' },
  statusSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
});
