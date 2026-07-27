import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useLogin, useResetPassword } from '@/hooks';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

const CODE_LENGTH = 6;

const schema = z
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

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const resetMutation = useResetPassword();
  const loginMutation = useLogin();
  const [showPw, setShowPw] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (data: FormValues) => {
    resetMutation.mutate(
      { token: data.code, newPassword: data.newPassword, confirmPassword: data.confirmPassword },
      {
        onSuccess: () => {
          // We have the email + new password → log the user in directly.
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

  const busy = resetMutation.isPending || loginMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)')}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Đặt lại mật khẩu</Text>
            <View style={styles.navSpacer} />
          </View>

          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🔑</Text>
            </View>
            <Text style={styles.title}>Tạo mật khẩu mới</Text>
            <Text style={styles.subtitle}>
              Nhập mã {CODE_LENGTH} ký tự đã gửi tới{email ? ` ${email}` : ' email của bạn'} và mật khẩu mới.
            </Text>
          </View>

          <View style={styles.card}>
            <AuthErrorBanner error={resetMutation.error ?? loginMutation.error} />

            <Controller
              control={control}
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
                  error={errors.code?.message}
                  containerStyle={styles.field}
                  editable={!busy}
                />
              )}
            />

            <Controller
              control={control}
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
                  error={errors.newPassword?.message}
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
                  containerStyle={styles.field}
                  editable={!busy}
                />
              )}
            />

            <Controller
              control={control}
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
                  error={errors.confirmPassword?.message}
                  containerStyle={styles.field}
                  editable={!busy}
                />
              )}
            />

            <Button
              title="Đặt lại mật khẩu"
              onPress={handleSubmit(onSubmit)}
              loading={busy}
              style={styles.submit}
            />
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, paddingBottom: SPACING[8] },
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
  backArrow: { fontSize: FONT_SIZE.xl, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onBackground,
  },
  navSpacer: { width: 40 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[6],
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
  iconEmoji: { fontSize: 36 },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    marginHorizontal: SPACING[4],
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  field: { marginBottom: SPACING[4] },
  submit: { marginTop: SPACING[2] },
});
