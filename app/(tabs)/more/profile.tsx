import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { ChangePasswordSheet } from '@/components/auth/ChangePasswordSheet';
import { useUser, useUpdateProfile } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatVND } from '@/utils/formatters';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading } = useUser();
  const updateMutation = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [income, setIncome] = useState('');
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setIncome(user.monthlyIncome ? String(user.monthlyIncome) : '');
  }, [user]);

  if (isLoading || !user) return <LoadingSpinner />;

  const handleSave = () => {
    if (displayName.trim().length === 0) {
      Alert.alert('Tên không hợp lệ', 'Vui lòng nhập tên hiển thị.');
      return;
    }
    updateMutation.mutate(
      {
        displayName: displayName.trim(),
        monthlyIncome: income ? parseInt(income, 10) : null,
      },
      {
        onSuccess: () => Alert.alert('Đã lưu', 'Hồ sơ của bạn đã được cập nhật.'),
        onError: () => Alert.alert('Lỗi', 'Không lưu được hồ sơ.'),
      },
    );
  };

  const handleAvatarUpload = () => {
    Alert.alert('Tải ảnh đại diện', 'Tính năng tải ảnh sẽ sớm ra mắt.');
  };

  const handleChangePassword = () => {
    setShowPasswordSheet(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={handleAvatarUpload}
              activeOpacity={0.85}
            >
              <Text style={styles.avatarLetter}>
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Chạm để đổi ảnh đại diện</Text>
          </View>

          {/* Profile fields */}
          <View style={styles.card}>
            <TextInput
              label="Tên hiển thị"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="VD: Nguyễn Văn A"
              autoCapitalize="words"
              containerStyle={styles.field}
            />

            <View style={styles.field}>
              <Text style={styles.readonlyLabel}>Email</Text>
              <View style={styles.readonlyValue}>
                <Text style={styles.readonlyText}>{user.email}</Text>
                <Text style={styles.readonlyLock}>🔒</Text>
              </View>
              <Text style={styles.readonlyHint}>Email không thể thay đổi</Text>
            </View>

            <TextInput
              label="Thu nhập hàng tháng (VND)"
              value={income}
              onChangeText={(t) => setIncome(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
            />
            {income.length > 0 ? (
              <Text style={styles.incomePreview}>
                {formatVND(parseInt(income, 10) || 0)}
              </Text>
            ) : null}
          </View>

          <Button
            title="Lưu thay đổi"
            onPress={handleSave}
            loading={updateMutation.isPending}
            style={styles.saveBtn}
          />

          {/* Password */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={handleChangePassword}
              activeOpacity={0.75}
            >
              <Text style={styles.linkIcon}>🔑</Text>
              <View style={styles.linkText}>
                <Text style={styles.linkLabel}>Đổi mật khẩu</Text>
                <Text style={styles.linkSub}>Thay đổi mật khẩu đăng nhập</Text>
              </View>
              <Text style={styles.linkChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showPasswordSheet ? (
        <ChangePasswordSheet
          visible={showPasswordSheet}
          onClose={() => setShowPasswordSheet(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  kav: { flex: 1 },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  avatarSection: { alignItems: 'center', marginBottom: SPACING[5] },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarLetter: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  avatarBadgeIcon: { fontSize: 14 },
  avatarHint: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  field: { marginBottom: SPACING[4] },

  readonlyLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[600],
    marginBottom: SPACING[1],
  },
  readonlyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
    minHeight: 48,
    gap: SPACING[2],
  },
  readonlyText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[700] },
  readonlyLock: { fontSize: FONT_SIZE.sm },
  readonlyHint: {
    marginTop: SPACING[1],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
  },

  incomePreview: {
    marginTop: SPACING[1],
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  saveBtn: { marginBottom: SPACING[4] },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  linkIcon: { fontSize: 24 },
  linkText: { flex: 1 },
  linkLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  linkSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },
  linkChevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },
});
