/**
 * ChangePasswordSheet -- inline bottom-sheet modal for password change.
 *
 * Renders nothing when `visible` is false. RHF + zod for validation, mutation
 * via useChangePassword. On success: shows toast via Alert and calls onClose.
 *
 * Magic test current-password "wrongpw" -> wrong_current_password error.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { useChangePassword } from '@/hooks';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu mới')
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

type FormValues = z.infer<typeof schema>;

export interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordSheet({ visible, onClose }: ChangePasswordSheetProps) {
  const mutation = useChangePassword();
  const insets = useSafeAreaInsets();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Reset form + mutation state every time the sheet is reopened.
  useEffect(() => {
    if (visible) {
      reset();
      mutation.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [visible]);

  const onSubmit = (data: FormValues) => {
    mutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          Alert.alert('Đã cập nhật mật khẩu', 'Mật khẩu của bạn đã được thay đổi.');
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: SPACING[4] + insets.bottom },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Đổi mật khẩu</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={mutation.isPending}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.subtitle}>
                Mật khẩu mới phải có ít nhất 8 ký tự và khác mật khẩu hiện tại.
              </Text>

              <AuthErrorBanner error={mutation.error} />

              {/* Current */}
              <Controller
                control={control}
                name="currentPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Mật khẩu hiện tại"
                    placeholder="Nhập mật khẩu hiện tại"
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.currentPassword?.message}
                    leftIcon={<Text style={styles.fieldIcon}>🔒</Text>}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowCurrent((p) => !p)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.showHide}>
                          {showCurrent ? 'Ẩn' : 'Hiện'}
                        </Text>
                      </TouchableOpacity>
                    }
                    containerStyle={styles.field}
                    editable={!mutation.isPending}
                  />
                )}
              />

              {/* New */}
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Mật khẩu mới"
                    placeholder="Tối thiểu 8 ký tự"
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.newPassword?.message}
                    leftIcon={<Text style={styles.fieldIcon}>🔑</Text>}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowNew((p) => !p)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.showHide}>
                          {showNew ? 'Ẩn' : 'Hiện'}
                        </Text>
                      </TouchableOpacity>
                    }
                    containerStyle={styles.field}
                    editable={!mutation.isPending}
                  />
                )}
              />

              {/* Confirm */}
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Xác nhận mật khẩu mới"
                    placeholder="Nhập lại mật khẩu mới"
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    leftIcon={<Text style={styles.fieldIcon}>🔑</Text>}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowConfirm((p) => !p)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.showHide}>
                          {showConfirm ? 'Ẩn' : 'Hiện'}
                        </Text>
                      </TouchableOpacity>
                    }
                    containerStyle={styles.field}
                    editable={!mutation.isPending}
                  />
                )}
              />

              <Button
                title="Cập nhật mật khẩu"
                onPress={handleSubmit(onSubmit)}
                loading={mutation.isPending}
                style={styles.submitBtn}
              />

              <Button
                title="Hủy"
                variant="ghost"
                onPress={onClose}
                disabled={mutation.isPending}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kav: {
    flexShrink: 1,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[3],
    maxHeight: '90%',
    ...SHADOW.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray[300],
    marginBottom: SPACING[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  closeIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.gray[500],
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING[4],
    lineHeight: 20,
  },
  field: {
    marginBottom: SPACING[4],
  },
  fieldIcon: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[400],
  },
  showHide: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.brand[500],
  },
  submitBtn: {
    marginBottom: SPACING[2],
  },
});
