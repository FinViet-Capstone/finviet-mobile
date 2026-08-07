import React, { useEffect, useState } from 'react';
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
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useForgotPassword, useResetPassword, useLogin } from '@/hooks';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Địa chỉ email không hợp lệ'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const CODE_LENGTH = 6;

const resetPasswordSchema = z
  .object({
    code: z.string().length(CODE_LENGTH, `Mã gồm ${CODE_LENGTH} ký tự`),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ in hoa')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const RESEND_COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const forgotMutation = useForgotPassword();
  const resetMutation = useResetPassword();
  const loginMutation = useLogin();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showPw, setShowPw] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const {
    control: resetControl,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onSubmit = (data: ForgotPasswordFormValues) => {
    forgotMutation.mutate(data.email, {
      onSuccess: () => {
        setSubmittedEmail(data.email);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      },
    });
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    const email = submittedEmail ?? getValues('email');
    if (!email) return;
    forgotMutation.mutate(email, {
      onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
    });
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)');
  };

  const onSubmitReset = (data: ResetPasswordFormValues) => {
    resetMutation.mutate(
      { token: data.code, newPassword: data.newPassword, confirmPassword: data.confirmPassword },
      {
        onSuccess: () => {
          const email = submittedEmail ?? getValues('email');
          if (email) {
            loginMutation.mutate(
              { email, password: data.newPassword },
              {
                onSuccess: (user) =>
                  router.replace(user.onboardingDone ? '/(tabs)/home' : '/onboarding'),
                onError: () => router.replace('/(auth)'),
              },
            );
          } else {
            router.replace('/(auth)');
          }
        },
      },
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const submitted = submittedEmail !== null;
  const resetBusy = resetMutation.isPending || loginMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
                ? 'Chúng tôi đã gửi mã đặt lại mật khẩu đến email của bạn.'
                : 'Nhập email đăng ký và chúng tôi sẽ gửi mã để bạn tạo mật khẩu mới.'}
            </Text>
          </View>

          {/* ── Card ────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            {submitted ? (
              /* ── Success state: enter code + new password inline ── */
              <View style={styles.successContent}>
                <View style={styles.successIconWrap}>
                  <Text style={styles.successIcon}>📬</Text>
                </View>
                <Text style={styles.successTitle}>Email đã được gửi!</Text>
                <Text style={styles.successMessage}>
                  Vui lòng kiểm tra hộp thư đến (và thư mục spam) tới{' '}
                  <Text style={styles.successHighlight}>{submittedEmail}</Text>
                  . Mã sẽ hết hạn sau{' '}
                  <Text style={styles.successHighlight}>1 giờ</Text>.
                </Text>

                <AuthErrorBanner
                  error={resetMutation.error ?? loginMutation.error ?? forgotMutation.error}
                />

                <Controller
                  control={resetControl}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Mã xác minh"
                      placeholder="VD: A1B2C3"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={CODE_LENGTH}
                      value={value}
                      onChangeText={(t) =>
                        onChange(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH))
                      }
                      onBlur={onBlur}
                      error={resetErrors.code?.message}
                      containerStyle={styles.fieldSpacing}
                      editable={!resetBusy}
                    />
                  )}
                />

                <Controller
                  control={resetControl}
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Mật khẩu mới"
                      placeholder="Tối thiểu 8 ký tự"
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={resetErrors.newPassword?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPw((p) => !p)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcon
                            name={showPw ? 'visibility_off' : 'visibility'}
                            size={20}
                            color={COLORS.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      }
                      containerStyle={styles.fieldSpacing}
                      editable={!resetBusy}
                    />
                  )}
                />

                <Controller
                  control={resetControl}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Xác nhận mật khẩu"
                      placeholder="Nhập lại mật khẩu mới"
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={resetErrors.confirmPassword?.message}
                      containerStyle={styles.fieldSpacing}
                      editable={!resetBusy}
                    />
                  )}
                />

                <Button
                  title="Đặt lại mật khẩu"
                  onPress={handleResetSubmit(onSubmitReset)}
                  loading={resetBusy}
                  style={styles.backLoginButton}
                />

                <TouchableOpacity
                  onPress={handleBackToLogin}
                  style={styles.cancelRow}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cancelLabel}>Quay lại Đăng nhập</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResend}
                  disabled={cooldown > 0 || forgotMutation.isPending}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.resendNote}>
                    Không nhận được email?{' '}
                    <Text
                      style={[
                        styles.resendLink,
                        (cooldown > 0 || forgotMutation.isPending) &&
                          styles.disabledLink,
                      ]}
                    >
                      {cooldown > 0
                        ? `Gửi lại sau ${cooldown}s`
                        : forgotMutation.isPending
                          ? 'Đang gửi...'
                          : 'Gửi lại'}
                    </Text>
                  </Text>
                </TouchableOpacity>

                {cooldown === 0 && !forgotMutation.isPending ? (
                  <Text style={styles.waitHint}>
                    Vẫn chưa thấy email? Kiểm tra lại chính tả địa chỉ email bạn đã nhập,
                    hoặc tạo tài khoản mới nếu bạn chưa đăng ký.
                  </Text>
                ) : null}
              </View>
            ) : (
              /* ── Form state ── */
              <View>
                <Text style={styles.cardLabel}>
                  Nhập địa chỉ email của bạn
                </Text>

                <AuthErrorBanner error={forgotMutation.error} />

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
                      editable={!forgotMutation.isPending}
                    />
                  )}
                />

                <Button
                  title="Gửi mã đặt lại"
                  onPress={handleSubmit(onSubmit)}
                  loading={forgotMutation.isPending}
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
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.surfaceContainer,
  },
  backArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
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
    backgroundColor: COLORS.background,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  iconEmoji: {
    fontSize: 36,
  },
  heroTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
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
  cardLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING[4],
  },

  // Fields
  fieldSpacing: {
    alignSelf: 'stretch',
    marginBottom: SPACING[5],
  },
  fieldIcon: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
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
    color: COLORS.primary,
  },

  // Success state
  successContent: {
    alignItems: 'center',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryContainer,
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
    color: COLORS.onBackground,
    marginBottom: SPACING[3],
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING[6],
  },
  successHighlight: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
  },
  backLoginButton: {
    alignSelf: 'stretch',
    marginBottom: SPACING[4],
  },
  resendNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  resendLink: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  disabledLink: {
    color: COLORS.outline,
  },
  waitHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING[3],
  },
});
