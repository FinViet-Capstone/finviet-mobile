import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';

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
import { createLinkToken, exchangePublicToken } from '@/services/linkedWalletSync';

export default function LinkAuthenticateScreen() {
  const router = useRouter();
  const { institutionId, institutionName } = useLocalSearchParams<{
    institutionId: string;
    institutionName: string;
  }>();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthenticate = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Thông tin không đầy đủ', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would open FinVerse Link UI
      // For now, we'll simulate the flow
      const linkToken = await createLinkToken('user_khoi_01');

      // Simulate successful authentication and public token exchange
      // In production, this would be handled by FinVerse Link SDK
      Alert.alert(
        'Đang phát triển',
        'Tính năng liên kết ngân hàng đang được phát triển. Vui lòng sử dụng ví cơ bản trong thời gian này.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Lỗi xác thực', 'Không thể kết nối với ngân hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực</Text>
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
          <View style={styles.institutionBanner}>
            <Text style={styles.institutionIcon}>🏦</Text>
            <Text style={styles.institutionName}>{institutionName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.infoText}>
              Nhập thông tin đăng nhập của bạn để kết nối với {institutionName}
            </Text>

            <TextInput
              label="Tên đăng nhập"
              value={username}
              onChangeText={setUsername}
              placeholder="Nhập tên đăng nhập"
              autoCapitalize="none"
              containerStyle={styles.field}
            />

            <TextInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="Nhập mật khẩu"
              secureTextEntry
              containerStyle={styles.field}
            />

            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Thông tin của bạn được mã hóa và bảo mật. FinViet không lưu trữ mật khẩu ngân hàng.
              </Text>
            </View>
          </View>

          <Button
            title="Xác thực và liên kết"
            onPress={handleAuthenticate}
            loading={loading}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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

  institutionBanner: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    marginBottom: SPACING[4],
  },
  institutionIcon: {
    fontSize: 48,
    marginBottom: SPACING[2],
  },
  institutionName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING[5],
    textAlign: 'center',
  },
  field: { marginBottom: SPACING[4] },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    gap: SPACING[2],
  },
  securityIcon: {
    fontSize: FONT_SIZE.lg,
  },
  securityText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand[700],
    lineHeight: 18,
  },

  submit: { marginTop: SPACING[2] },
});
