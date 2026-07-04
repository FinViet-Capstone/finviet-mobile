/**
 * link-bank.tsx — Finverse bank-link flow (consumer aggregation).
 *
 * OAuth-like UX: tap → open Finverse's hosted Link UI in a WebView → the user picks
 * their bank and logs in there (we never see their bank password) → Finverse posts the
 * auth code to the backend.
 *
 * The backend requests `response_mode=form_post` with its RedirectUri pointed at
 * POST /api/wallets/finverse/callback, so on completion Finverse form-posts the code
 * straight to the backend, which exchanges it, creates the linked wallet(s), and
 * imports transactions. This screen therefore:
 *   1. detects the WebView navigating to the callback path (host-agnostic), and
 *   2. reads the backend's ApiResponse envelope off that page to learn success/failure.
 * As a fallback for redirect modes that deliver the `code` in the URL query, it
 * captures the code and calls complete-link itself.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView, type WebViewNavigation, type WebViewMessageEvent } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { MaterialIcon } from '@/components/common/MaterialIcon';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import {
  createFinverseLink,
  completeFinverseLink,
  FINVERSE_CALLBACK_PATH,
  type FinverseLink,
} from '@/services/real/finverse';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

type Phase = 'loading' | 'webview' | 'completing' | 'error';

const DEFAULT_ERROR = 'Không liên kết được ngân hàng. Vui lòng thử lại.';

// Injected on every page load; when the page body is the backend's JSON envelope
// (the callback response), post it back so we can read success/failure. Guards on
// the envelope shape so it never fires on Finverse's own HTML pages.
const READ_ENVELOPE_JS = `(function(){try{var t=document.body?document.body.innerText:'';if(t&&t.trim().charAt(0)==='{'&&t.indexOf('"success"')!==-1){window.ReactNativeWebView.postMessage(t);}}catch(e){}})();true;`;

function extractCodeState(url: string): { code: string; state: string | null } | null {
  const code = url.match(/[?&]code=([^&]+)/);
  if (!code) return null;
  const state = url.match(/[?&]state=([^&]+)/);
  return {
    code: decodeURIComponent(code[1]),
    state: state ? decodeURIComponent(state[1]) : null,
  };
}

function isCallbackUrl(url: string): boolean {
  return url.includes(FINVERSE_CALLBACK_PATH);
}

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
    if (!e.response) return 'Mất kết nối mạng. Hãy kiểm tra kết nối và thử lại.';
  }
  return DEFAULT_ERROR;
}

export default function LinkBankScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);

  const [phase, setPhase] = useState<Phase>('loading');
  const [link, setLink] = useState<FinverseLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Once the link is resolved (success or failure) we ignore further WebView events —
  // Finverse + the callback can fire several navigations for one completion.
  const settledRef = useRef(false);

  // Start (or retry, via reloadKey) a link session on mount.
  useEffect(() => {
    let cancelled = false;
    settledRef.current = false;
    setError(null);
    setPhase('loading');
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

  const finish = useCallback(async () => {
    if (settledRef.current) return;
    settledRef.current = true;
    // If reached during onboarding, the linked wallet satisfies the "create your
    // first wallet" step. Idempotent otherwise.
    markOnboardingDone();
    await qc.invalidateQueries({ queryKey: queryKeys.wallets.all() });
    await qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    router.replace('/(tabs)/wallets');
  }, [markOnboardingDone, qc, router]);

  const fail = useCallback((message: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setError(message);
    setPhase('error');
  }, []);

  // Client-driven completion for redirect modes that deliver the code in the URL.
  const completeWithCode = useCallback(
    async (code: string, state: string) => {
      if (settledRef.current) return;
      setPhase('completing');
      try {
        await completeFinverseLink(code, state);
        await finish();
      } catch (e) {
        fail(errorMessage(e));
      }
    },
    [finish, fail],
  );

  // The backend callback page renders its ApiResponse envelope; read success/failure.
  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      if (settledRef.current) return;
      try {
        const body = JSON.parse(e.nativeEvent.data) as {
          success?: boolean;
          message?: string;
        };
        if (typeof body.success !== 'boolean') return;
        if (body.success) void finish();
        else fail(body.message || DEFAULT_ERROR);
      } catch {
        // Not our envelope — ignore.
      }
    },
    [finish, fail],
  );

  // Intercept navigations. A `?code=` redirect → we complete the link ourselves and
  // block the page load. A navigation to the backend callback → let it proceed (the
  // backend links server-side) and switch to the completing overlay; the injected
  // script reports the outcome via onMessage.
  const onShouldStart = (req: WebViewNavigation): boolean => {
    if (settledRef.current) return false;

    const codeState = extractCodeState(req.url);
    if (codeState && !isCallbackUrl(req.url)) {
      void completeWithCode(codeState.code, codeState.state ?? link?.state ?? '');
      return false;
    }

    if (isCallbackUrl(req.url)) {
      setPhase('completing');
      return true;
    }
    return true;
  };

  const onNavStateChange = (nav: WebViewNavigation) => {
    if (settledRef.current) return;
    // Android safety net: some redirects surface here rather than in onShouldStart.
    const codeState = extractCodeState(nav.url);
    if (codeState && !isCallbackUrl(nav.url)) {
      void completeWithCode(codeState.code, codeState.state ?? link?.state ?? '');
      return;
    }
    if (isCallbackUrl(nav.url) && phase !== 'completing') {
      setPhase('completing');
    }
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

      {link && (phase === 'webview' || phase === 'completing') ? (
        <View style={styles.flex}>
          <WebView
            source={{ uri: link.linkUrl }}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            originWhitelist={['*']}
            injectedJavaScript={READ_ENVELOPE_JS}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={onNavStateChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          />
          {phase === 'completing' && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang nhập giao dịch từ ngân hàng…</Text>
            </View>
          )}
        </View>
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
          <Text style={styles.loadingText}>Đang kết nối tới Finverse…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
    backgroundColor: COLORS.background,
  },
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
