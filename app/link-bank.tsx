/**
 * link-bank.tsx — Finverse bank-link flow (consumer aggregation).
 *
 * This is the OAuth-like UX you wanted: tap → we open Finverse's hosted Link UI in a
 * WebView → the user picks their bank and logs in there (we never see their bank
 * password) → Finverse redirects to our redirectUri with ?code= → we capture it and
 * the backend exchanges it, creates the linked wallet(s), and imports transactions.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { createFinverseLink, exchangeFinverse, type FinverseLink } from '@/services/real/finverse';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

type Phase = 'loading' | 'webview' | 'exchanging' | 'error';

function extractCode(url: string): string | null {
  const m = url.match(/[?&]code=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
    if (!e.response) return 'Mất kết nối mạng. Hãy kiểm tra kết nối và thử lại.';
  }
  return 'Không liên kết được ngân hàng. Vui lòng thử lại.';
}

export default function LinkBankScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);

  const [phase, setPhase] = useState<Phase>('loading');
  const [link, setLink] = useState<FinverseLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handledCode, setHandledCode] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Start (or retry, via reloadKey) a link session on mount.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPhase('loading');
    setHandledCode(false);
    (async () => {
      try {
        const data = await createFinverseLink();
        if (!cancelled) {
          setLink(data);
          setPhase('webview');
        }
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const completeExchange = async (code: string) => {
    setPhase('exchanging');
    try {
      await exchangeFinverse(code, link?.state);
      // If this was reached during onboarding, the linked wallet satisfies the
      // "create your first wallet" step. Idempotent otherwise.
      markOnboardingDone();
      await qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
      await qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      router.replace('/(tabs)/wallets');
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  };

  // Intercept the navigation to our redirectUri and grab ?code=. Returning false stops
  // the WebView from actually loading that (non-existent) page.
  const onShouldStart = (req: WebViewNavigation): boolean => {
    if (link && req.url.startsWith(link.redirectUri) && !handledCode) {
      const code = extractCode(req.url);
      if (code) {
        setHandledCode(true);
        completeExchange(code);
        return false;
      }
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcon name="close" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liên kết ngân hàng</Text>
        <View style={styles.headerBtn} />
      </View>

      {phase === 'webview' && link ? (
        <WebView
          source={{ uri: link.linkUrl }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={(nav) => {
            // Android safety net: some redirects fire here rather than onShouldStart.
            if (link && nav.url.startsWith(link.redirectUri) && !handledCode) {
              const code = extractCode(nav.url);
              if (code) {
                setHandledCode(true);
                completeExchange(code);
              }
            }
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        />
      ) : phase === 'error' ? (
        <View style={styles.center}>
          <MaterialIcon name="error" size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.retryBtn}
            onPress={() => setReloadKey((k) => k + 1)}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {phase === 'exchanging' ? 'Đang nhập giao dịch từ ngân hàng…' : 'Đang kết nối tới Finverse…'}
          </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING[6], gap: SPACING[4] },
  loadingText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  retryText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onPrimary },
});
