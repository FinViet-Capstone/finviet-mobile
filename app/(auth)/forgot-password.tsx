import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Địa chỉ email không hợp lệ'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onSubmit = (_data: ForgotPasswordFormValues) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top navigation bar ──────────────────────────────────────── */}
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={handleBackToLogin}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Quên mật khẩu</Text>
            {/* Spacer to center title */}
            <View style={styles.navSpacer} />
          </View>

          {/* ── Hero ────────────────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{submitted ? '✅' : '🔒'}</Text>
            </View>
            <Text style={styles.heroTitle}>
              {submitted ? 'Kiểm tra email của bạn!' : 'Đặt lại mật khẩu'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {submitted
                ? 'Chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn.'
                : 'Nhập email đăng ký và chúng tôi sẽ gửi link để bạn tạo mật khẩu mới.'}
            </Text>
          </View>

          {/* ── Card ────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            {submitted ? (
              /* ── Success state ── */
              <View style={styles.successContent}>
                <View style={styles.successIconWrap}>
                  <Text style={styles.successIcon}>📬</Text>
                </View>
                <Text style={styles.successTitle}>Email đã được gửi!</Text>
                <Text style={styles.successMessage}>
                  Vui lòng kiểm tra hộp thư đến (và thư mục spam) để tìm
                  link đặt lại mật khẩu. Link sẽ hết hạn sau{' '}
                  <Text style={styles.successHighlight}>30 phút</Text>.
                </Text>
                <Button
                  title="Quay lại Đăng nhập"
                  onPress={handleBackToLogin}
                  style={styles.backLoginButton}
                />
                <Text style={styles.resendNote}>
                  Không nhận được email?{' '}
                  <Text style={styles.resendLink}>Gửi lại</Text>
                </Text>
              </View>
            ) : (
              /* ── Form state ── */
              <View>
                <Text style={styles.cardLabel}>
                  Nhập địa chỉ email của bạn
                </Text>

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Email"
                      placeholder="ban@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      leftIcon={<Text style={styles.fieldIcon}>✉</Text>}
                      containerStyle={styles.fieldSpacing}
                    />
                  )}
                />

                <Button
                  title="Gửi link đặt lại"
                  onPress={handleSubmit(onSubmit)}
                  loading={loading}
                  style={styles.submitButton}
                />

                <TouchableOpacity
                  onPress={handleBackToLogin}
                  style={styles.cancelRow}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cancelLabel}>
                    Quay lại Đăng nhập
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Layout
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.brand[500],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING[8],
  },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[2],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[400],
  },
  backArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
  navSpacer: {
    width: 40,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[8],
    backgroundColor: COLORS.brand[500],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
    ...SHADOW.md,
  },
  iconEmoji: {
    fontSize: 36,
  },
  heroTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    textAlign: 'center',
    lineHeight: 22,
  },

  // Card
  card: {
    marginHorizontal: SPACING[4],
    marginTop: -SPACING[2],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[6],
    ...SHADOW.lg,
  },
  cardLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING[4],
  },

  // Fields
  fieldSpacing: {
    marginBottom: SPACING[5],
  },
  fieldIcon: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[400],
  },

  // Submit / cancel
  submitButton: {
    marginBottom: SPACING[4],
  },
  cancelRow: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  cancelLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.brand[500],
  },

  // Success state
  successContent: {
    alignItems: 'center',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  successIcon: {
    fontSize: 36,
  },
  successTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[3],
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING[6],
  },
  successHighlight: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[700],
  },
  backLoginButton: {
    alignSelf: 'stretch',
    marginBottom: SPACING[4],
  },
  resendNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  resendLink: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.brand[500],
  },
});
