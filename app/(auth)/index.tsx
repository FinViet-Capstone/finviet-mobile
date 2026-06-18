import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialIcon } from '@/components/common/MaterialIcon';

import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useLogin, useRegister, useGoogleOAuth } from '@/hooks';
import { isAuthError } from '@/types/auth';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Validation schemas
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

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(1, 'Tên không được để trống')
      .min(2, 'Tên phải có ít nhất 2 ký tự'),
    email: z
      .string()
      .min(1, 'Email không được để trống')
      .email('Địa chỉ email không hợp lệ'),
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ in hoa')
      .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AuthScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const googleMutation = useGoogleOAuth(activeTab === 'login' ? 'login' : 'register');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'test@finviet.com',
      password: 'Password123'
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: 'Nguyễn Văn A',
      email: 'newuser@finviet.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: (user) =>
        router.replace(user.onboardingDone ? '/(tabs)/home' : '/onboarding'),
      // Unverified account → send them to the verify screen (enter / resend code)
      // instead of dead-ending on the "email not verified" banner.
      onError: (err) => {
        if (isAuthError(err) && err.code === 'email_not_verified') {
          router.push({
            pathname: '/(auth)/verify-email',
            params: { email: data.email },
          });
        }
      },
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(
      {
        displayName: data.displayName,
        email: data.email,
        password: data.password,
      },
      {
        onSuccess: (user) =>
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: user.email },
          }),
      },
    );
  };

  const handleGoogleAuth = () => {
    googleMutation.mutate(undefined, {
      onSuccess: (user) =>
        router.replace(user.onboardingDone ? '/(tabs)/home' : '/onboarding'),
    });
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const isBusy =
    loginMutation.isPending || registerMutation.isPending || googleMutation.isPending;
  const surfacedError =
    loginMutation.error ?? registerMutation.error ?? googleMutation.error;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.appName}>FinViet</Text>
            <Text style={styles.tagline}>Quản lý tài chính thông minh</Text>
          </View>

          {/* ── Auth Card ────────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Glassmorphic accent */}
            <View style={styles.glassAccent} />

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <Pressable
                style={styles.tab}
                onPress={() => setActiveTab('login')}
                disabled={isBusy}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'login' && styles.tabTextActive,
                  ]}
                >
                  Đăng nhập
                </Text>
                {activeTab === 'login' && <View style={styles.tabIndicator} />}
              </Pressable>

              <Pressable
                style={styles.tab}
                onPress={() => setActiveTab('register')}
                disabled={isBusy}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'register' && styles.tabTextActive,
                  ]}
                >
                  Đăng ký
                </Text>
                {activeTab === 'register' && <View style={styles.tabIndicator} />}
              </Pressable>
            </View>

            <AuthErrorBanner error={surfacedError} />

            {/* ── Login Form ──────────────────────────────────────────── */}
            {activeTab === 'login' && (
              <View style={styles.form}>
                <Controller
                  control={loginForm.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Email"
                      placeholder="Nhập email của bạn"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={loginForm.formState.errors.email?.message}
                      containerStyle={styles.fieldSpacing}
                      editable={!isBusy}
                    />
                  )}
                />

                <Controller
                  control={loginForm.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Mật khẩu"
                      placeholder="Nhập mật khẩu"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={loginForm.formState.errors.password?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPassword((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcon
                            name={showPassword ? 'visibility_off' : 'visibility'}
                            size={20}
                            color={COLORS.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      }
                      containerStyle={styles.fieldSpacing}
                      editable={!isBusy}
                    />
                  )}
                />

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.forgotRow}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isBusy}
                >
                  <Text style={styles.forgotLabel}>Quên mật khẩu?</Text>
                </TouchableOpacity>

                <Button
                  title="Đăng nhập"
                  onPress={loginForm.handleSubmit(onLoginSubmit)}
                  loading={loginMutation.isPending}
                  disabled={isBusy}
                  style={styles.submitButton}
                />
              </View>
            )}

            {/* ── Register Form ───────────────────────────────────────── */}
            {activeTab === 'register' && (
              <View style={styles.form}>
                <Controller
                  control={registerForm.control}
                  name="displayName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Họ và tên"
                      placeholder="Nguyễn Văn A"
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={registerForm.formState.errors.displayName?.message}
                      containerStyle={styles.fieldSpacing}
                      editable={!isBusy}
                    />
                  )}
                />

                <Controller
                  control={registerForm.control}
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
                      error={registerForm.formState.errors.email?.message}
                      containerStyle={styles.fieldSpacing}
                      editable={!isBusy}
                    />
                  )}
                />

                <Controller
                  control={registerForm.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Mật khẩu"
                      placeholder="Tối thiểu 8 ký tự"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={registerForm.formState.errors.password?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPassword((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcon
                            name={showPassword ? 'visibility_off' : 'visibility'}
                            size={20}
                            color={COLORS.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      }
                      containerStyle={styles.fieldSpacing}
                      editable={!isBusy}
                    />
                  )}
                />

                <Controller
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Xác nhận mật khẩu"
                      placeholder="Nhập lại mật khẩu"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={registerForm.formState.errors.confirmPassword?.message}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcon
                            name={
                              showConfirmPassword ? 'visibility_off' : 'visibility'
                            }
                            size={20}
                            color={COLORS.onSurfaceVariant}
                          />
                        </TouchableOpacity>
                      }
                      containerStyle={styles.fieldSpacing}
                      editable={!isBusy}
                    />
                  )}
                />

                <Text style={styles.termsText}>
                  Bằng cách đăng ký, bạn đồng ý với{' '}
                  <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{' '}
                  <Text style={styles.termsLink}>Chính sách bảo mật</Text> của chúng
                  tôi.
                </Text>

                <Button
                  title="Tạo tài khoản"
                  onPress={registerForm.handleSubmit(onRegisterSubmit)}
                  loading={registerMutation.isPending}
                  disabled={isBusy}
                  style={styles.submitButton}
                />
              </View>
            )}

            {/* ── Divider & Google Auth ───────────────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title={
                googleMutation.isPending
                  ? 'Đang kết nối Google...'
                  : activeTab === 'login'
                  ? 'Đăng nhập với Google'
                  : 'Đăng ký với Google'
              }
              onPress={handleGoogleAuth}
              variant="secondary"
              loading={googleMutation.isPending}
              disabled={isBusy}
            />
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[8],
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING[8],
  },
  appName: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginBottom: SPACING[1],
  },
  tagline: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },

  // Card
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  glassAccent: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 160,
    height: 160,
    backgroundColor: COLORS.primary + '1A', // 10% opacity
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.3,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    marginBottom: SPACING[5],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: BORDER_RADIUS.full,
    borderTopRightRadius: BORDER_RADIUS.full,
  },

  // Form
  form: {
    position: 'relative',
    zIndex: 10,
  },
  fieldSpacing: {
    marginBottom: SPACING[4],
  },

  // Forgot password
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: SPACING[1],
    marginBottom: SPACING[5],
  },
  forgotLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
  },

  // Terms
  termsText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: SPACING[5],
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Submit button
  submitButton: {
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
    backgroundColor: COLORS.outlineVariant,
  },
  dividerText: {
    marginHorizontal: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
});
