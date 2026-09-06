/**
 * link-sepay.tsx — SePay OAuth2 bank-link flow.
 *
 * Flow:
 *  1. Fetch the authorize URL + a signed `state` token from the backend
 *     (GET /wallets/sepay/authorize-url) — the backend owns ClientId/
 *     RedirectUri config, so the client never constructs this URL itself.
 *  2. Open that URL in a WebView.
 *  3. User logs in to SePay and authorizes our app.
 *  4. SePay redirects back to the backend-registered redirect URI with `?code=...`.
 *  5. We capture the code and send it + `state` to POST /wallets/sepay/link.
 *  6. Backend validates `state`, exchanges code for tokens, creates wallet,
 *     syncs transactions.
 *  7. Navigate back to wallets with the new linked wallet.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { queryKeys } from '@/lib/queryKeys';
import { linkSepayAccount, getSepayAuthorizeUrl } from '@/services/real/sepay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

type Phase = 'loading' | 'webview' | 'completing' | 'success' | 'error';

const DEFAULT_ERROR = 'Không liên kết được tài khoản SePay. Vui lòng thử lại.';

function extractCode(url: string): string | null {
  const match = url.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LinkSepayScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const qc = useQueryClient();
  const settledRef = useRef(false);
  const stateRef = useRef<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR);
  const [syncCount, setSyncCount] = useState(0);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);

  const fetchAuthorizeUrl = useCallback(async () => {
    setPhase('loading');
    try {
      const result = await getSepayAuthorizeUrl();
      stateRef.current = result.state;
      setAuthorizeUrl(result.authorizeUrl);
      setPhase('webview');
    } catch (err: any) {
      setErrorMessage(err?.message ?? DEFAULT_ERROR);
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    fetchAuthorizeUrl();
  }, [fetchAuthorizeUrl]);

  const handleCodeCaptured = useCallback(async (code: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPhase('completing');

    try {
      const result = await linkSepayAccount(code, undefined, stateRef.current);
      setSyncCount(result.transactionsSynced);
      setPhase('success');

      // Invalidate caches so the wallet list / transaction list refresh.
      qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });

      // Auto-navigate after a short delay.
      setTimeout(() => {
        router.replace('/(tabs)/wallets');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err?.message ?? DEFAULT_ERROR);
      setPhase('error');
      settledRef.current = false;
    }
  }, [qc, router]);

  const handleNavigationChange = useCallback((event: WebViewNavigation) => {
    const code = extractCode(event.url);
    if (code) {
      handleCodeCaptured(code);
    }
  }, [handleCodeCaptured]);

  const handleRetry = useCallback(() => {
    settledRef.current = false;
    setErrorMessage(DEFAULT_ERROR);
    fetchAuthorizeUrl();
  }, [fetchAuthorizeUrl]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
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
        <Text style={styles.headerTitle}>Liên kết SePay</Text>
        <View style={styles.headerBtn} />
      </View>

      {phase === 'loading' && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusSubtitle}>Đang chuẩn bị liên kết...</Text>
        </View>
      )}

      {phase === 'webview' && authorizeUrl && (
        <WebView
          source={{ uri: authorizeUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Đang tải SePay...</Text>
            </View>
          )}
          // Handle SePay's redirect: detect code in URL query params.
          onShouldStartLoadWithRequest={(request) => {
            const code = extractCode(request.url);
            if (code) {
              handleCodeCaptured(code);
              return false; // prevent navigation — we handle it ourselves
            }
            return true;
          }}
        />
      )}

      {phase === 'completing' && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusTitle}>Đang liên kết tài khoản...</Text>
          <Text style={styles.statusSubtitle}>
            Đang đồng bộ giao dịch từ ngân hàng. Có thể mất 30-60 giây.
          </Text>
        </View>
      )}

      {phase === 'success' && (
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <MaterialIcon name="check_circle" size={64} color={colors.tertiary} />
          </View>
          <Text style={styles.statusTitle}>Liên kết thành công!</Text>
          <Text style={styles.statusSubtitle}>
            Đã đồng bộ {syncCount} giao dịch từ ngân hàng của bạn.
          </Text>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <MaterialIcon name="error" size={64} color={colors.error} />
          </View>
          <Text style={styles.statusTitle}>Liên kết thất bại</Text>
          <Text style={styles.statusSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.retryBtn}
            onPress={handleRetry}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[3],
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.primary,
      textAlign: 'center',
    },
    webview: { flex: 1 },
    loadingOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      gap: SPACING[3],
    },
    loadingText: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING[8],
      gap: SPACING[3],
    },
    successIcon: { marginBottom: SPACING[2] },
    errorIcon: { marginBottom: SPACING[2] },
    statusTitle: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
      textAlign: 'center',
    },
    statusSubtitle: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryBtn: {
      marginTop: SPACING[4],
      paddingHorizontal: SPACING[6],
      paddingVertical: SPACING[3],
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.lg,
    },
    retryText: {
      color: colors.onPrimary,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
    },
  });
}
