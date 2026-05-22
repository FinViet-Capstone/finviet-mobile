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
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useLogin, useGoogleOAuth } from '@/hooks';
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

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Địa chỉ email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLogin();
  const googleMutation = useGoogleOAuth('login');
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => router.replace('/(tabs)/report'),
    });
  };

  const handleGoogleLogin = () => {
    googleMutation.mutate(undefined, {
      onSuccess: (user) =>
        router.replace(user.onboardingDone ? '/(tabs)/report' : '/onboarding'),
    });
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleCreateAccount = () => {
    router.push('/(auth)/register');
  };

  const isBusy = loginMutation.isPending || googleMutation.isPending;
  const surfacedError = loginMutation.error ?? googleMutation.error;

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
          {/* ── Hero header ─────────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.appName}>FinViet</Text>
            <Text style={styles.tagline}>Quản lý tài chính thông minh</Text>
          </View>

          {/* ── Card ────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardSubtitle}>
              Chào mừng bạn quay trở lại!
            </Text>

            <AuthErrorBanner error={surfacedError} />

            {/* Email field */}
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
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  leftIcon={<Text style={styles.fieldIcon}>✉</Text>}
                  containerStyle={styles.fieldSpacing}
                  editable={!isBusy}
                />
              )}
            />

            {/* Password field */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Mật khẩu"
                  placeholder="Tối thiểu 8 ký tự"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  leftIcon={<Text style={styles.fieldIcon}>🔒</Text>}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.showHideLabel}>
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </Text>
                    </TouchableOpacity>
                  }
                  containerStyle={styles.fieldSpacing}
                  editable={!isBusy}
                />
              )}
            />

            {/* Forgot password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={isBusy}
            >
              <Text style={styles.forgotLabel}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Log in button */}
            <Button
              title="Đăng nhập"
              onPress={handleSubmit(onSubmit)}
              loading={loginMutation.isPending}
              disabled={isBusy}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth button */}
            <TouchableOpacity
              style={[styles.googleButton, isBusy && styles.googleButtonBusy]}
              onPress={handleGoogleLogin}
              activeOpacity={0.75}
              disabled={isBusy}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleLabel}>
                {googleMutation.isPending
                  ? 'Đang kết nối Google...'
                  : 'Tiếp tục với Google'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer link ─────────────────────────────────────────────── */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={handleCreateAccount} disabled={isBusy}>
              <Text style={styles.footerLink}>Tạo tài khoản</Text>
            </TouchableOpacity>
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

  // Hero header
  heroSection: {
    alignItems: 'center',
    paddingTop: SPACING[8],
    paddingBottom: SPACING[6],
    backgroundColor: COLORS.brand[500],
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
    ...SHADOW.md,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },
  tagline: {
    marginTop: SPACING[1],
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.brand[100],
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
  cardTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[1],
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING[5],
  },

  // Fields
  fieldSpacing: {
    marginBottom: SPACING[4],
  },
  fieldIcon: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[400],
  },
  showHideLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.brand[500],
  },

  // Forgot password
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -SPACING[2],
    marginBottom: SPACING[5],
  },
  forgotLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.brand[500],
  },

  // Login button
  loginButton: {
    marginBottom: SPACING[5],
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    marginHorizontal: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[400],
  },

  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    gap: SPACING[3],
    ...SHADOW.sm,
  },
  googleButtonBusy: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#4285F4',
  },
  googleLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[700],
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING[6],
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
  },
  footerLink: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
