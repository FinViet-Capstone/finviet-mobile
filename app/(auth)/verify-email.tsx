import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useResendVerification, useVerifyEmail } from '@/hooks';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '@/constants/theme';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const resendMutation = useResendVerification();
  const verifyMutation = useVerifyEmail();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resentOnce, setResentOnce] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Keep only A–Z / 0–9, force uppercase, cap at the code length.
  const handleCodeChange = (text: string) => {
    setCode(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH));
  };

  const handleVerify = () => {
    if (code.length !== CODE_LENGTH) return;
    verifyMutation.mutate(code, {
      // Verify-first: after success the user logs in (register issued no tokens).
      onSuccess: () => {
        Alert.alert(
          'Xác minh thành công',
          'Email của bạn đã được xác minh. Hãy đăng nhập để tiếp tục.',
          [{ text: 'Đăng nhập', onPress: () => router.replace('/(auth)') }],
        );
      },
    });
  };

  const handleResend = () => {
    if (!email) {
      Alert.alert('Thiếu email', 'Không tìm thấy email để gửi lại.');
      return;
    }
    if (cooldown > 0) return;
    resendMutation.mutate(email, {
      onSuccess: () => {
        setResentOnce(true);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      },
    });
  };

  const handleUseDifferentEmail = () => {
    router.replace('/(auth)');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const resendLabel =
    cooldown > 0
      ? `Gửi lại sau ${cooldown}s`
      : resendMutation.isPending
        ? 'Đang gửi...'
        : 'Gửi lại mã';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📬</Text>
          </View>
          <Text style={styles.title}>Xác minh email của bạn</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác minh tới
          </Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>

        {/* ── Card ────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <AuthErrorBanner error={verifyMutation.error ?? resendMutation.error} />

          {resentOnce && !resendMutation.isPending && cooldown > 0 ? (
            <View style={styles.successPill}>
              <Text style={styles.successText}>
                Đã gửi lại mã. Hãy kiểm tra hộp thư.
              </Text>
            </View>
          ) : null}

          <Text style={styles.body}>
            Nhập mã <Text style={styles.bodyBold}>{CODE_LENGTH} ký tự</Text> trong
            email để xác minh tài khoản. Mã sẽ hết hạn sau{' '}
            <Text style={styles.bodyBold}>24 giờ</Text>.
          </Text>

          <TextInput
            label="Mã xác minh"
            placeholder="VD: A1B2C3"
            value={code}
            onChangeText={handleCodeChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_LENGTH}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
            editable={!verifyMutation.isPending}
            containerStyle={styles.codeField}
          />

          <Button
            title="Xác minh"
            onPress={handleVerify}
            loading={verifyMutation.isPending}
            disabled={code.length !== CODE_LENGTH || verifyMutation.isPending}
            style={styles.primaryAction}
          />

          <TouchableOpacity
            onPress={handleResend}
            style={styles.secondaryAction}
            disabled={cooldown > 0 || resendMutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.secondaryLabel,
                (cooldown > 0 || resendMutation.isPending) && styles.disabledLabel,
              ]}
            >
              {resendLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleUseDifferentEmail}
            style={styles.tertiaryAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.tertiaryLabel}>Dùng email khác</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING[8],
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: SPACING[10],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[6],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[5],
  },
  iconEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING[1],
  },
  email: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
    textAlign: 'center',
  },

  // Card
  card: {
    marginHorizontal: SPACING[4],
    marginTop: -SPACING[2],
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  body: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
    lineHeight: 22,
    marginBottom: SPACING[3],
  },
  bodyBold: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
  },
  codeField: {
    marginBottom: SPACING[5],
  },
  helperNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: SPACING[5],
  },

  // Success pill
  successPill: {
    backgroundColor: COLORS.primaryContainer,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    marginBottom: SPACING[4],
  },
  successText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onPrimaryContainer,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Actions
  primaryAction: {
    marginBottom: SPACING[3],
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  secondaryLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  disabledLabel: {
    color: COLORS.outline,
  },
  tertiaryAction: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  tertiaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
});
