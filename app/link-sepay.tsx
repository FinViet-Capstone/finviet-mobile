/**
 * link-sepay.tsx — SePay OAuth2 bank-link flow.
 *
 * Flow:
 *  1. Open SePay OAuth2 authorize URL in a WebView.
 *  2. User logs in to SePay and authorizes our app.
 *  3. SePay redirects back to our redirect URI with `?code=...`.
 *  4. We capture the code and send it to POST /wallets/sepay/link.
 *  5. Backend exchanges code for tokens, creates wallet, syncs transactions.
 *  6. Navigate back to wallets with the new linked wallet.
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { queryKeys } from '@/lib/queryKeys';
import { linkSepayAccount } from '@/services/real/sepay';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/env';

type Phase = 'webview' | 'completing' | 'success' | 'error';

const DEFAULT_ERROR = 'Không liên kết được tài khoản SePay. Vui lòng thử lại.';

// SePay OAuth2 configuration.
// In production these would come from env vars; for the demo the backend holds the
// client_id / client_secret. The frontend only needs the authorize URL.
const SEPAY_AUTHORIZE_URL = 'https://my.sepay.vn/oauth/authorize';

// Build the redirect URI that matches what's registered with SePay.
// The backend callback endpoint: POST /api/wallets/sepay/callback (if we had one),
// but since SePay supports standard redirect, we use a deep link or the backend URL.
function getSepayRedirectUri(): string {
  // Use the API base URL as the redirect URI base.
  const base = (API_BASE_URL ?? '').replace(/\/api\/?$/, '');
  return `${base}/api/wallets/sepay/callback`;
}

function buildAuthorizeUrl(): string {
  // The client_id is configured server-side. For the demo, we use the redirect_uri
  // that matches the backend registration. The user can paste these in .env.
  const clientId = process.env.EXPO_PUBLIC_SEPAY_CLIENT_ID ?? '';
  const redirectUri = getSepayRedirectUri();
  const scope = 'profile bank-account:read transaction:read';
  const state = Math.random().toString(36).slice(2);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state,
  });

  return `${SEPAY_AUTHORIZE_URL}?${params.toString()}`;
}

function extractCode(url: string): string | null {
  const match = url.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LinkSepayScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const settledRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('webview');
  const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR);
  const [syncCount, setSyncCount] = useState(0);

  const authorizeUrl = buildAuthorizeUrl();

  const handleCodeCaptured = useCallback(async (code: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPhase('completing');

    try {
      const result = await linkSepayAccount(code);
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
    setPhase('webview');
    setErrorMessage(DEFAULT_ERROR);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <MaterialIcon name="arrow_back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liên kết SePay</Text>
        <View style={styles.headerBtn} />
      </View>

      {phase === 'webview' && (
        <WebView
          source={{ uri: authorizeUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
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
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.statusTitle}>Đang liên kết tài khoản...</Text>
          <Text style={styles.statusSubtitle}>
            Đang đồng bộ giao dịch từ ngân hàng. Có thể mất 30-60 giây.
          </Text>
        </View>
      )}

      {phase === 'success' && (
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <MaterialIcon name="check_circle" size={64} color={COLORS.tertiary} />
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
            <MaterialIcon name="error" size={64} color={COLORS.error} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
    color: COLORS.primary,
    textAlign: 'center',
  },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[3],
  },
  loadingText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
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
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
