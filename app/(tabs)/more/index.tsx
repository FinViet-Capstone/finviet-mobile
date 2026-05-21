import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { useAuthStore } from '@/stores/authStore';
import { useUser } from '@/hooks';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  description?: string;
}

const SETTINGS_ITEMS: MenuItem[] = [
  { icon: '👤', label: 'Hồ sơ cá nhân', route: '/(tabs)/more/profile', description: 'Tên, ảnh đại diện, thu nhập' },
  { icon: '⚙️', label: 'Tùy chọn', route: '/(tabs)/more/preferences', description: 'Ngôn ngữ, giao diện, thông báo' },
  { icon: '🔔', label: 'Trung tâm thông báo', route: '/(tabs)/more/notifications', description: 'Lịch sử thông báo và cảnh báo' },
];

const TOOL_ITEMS: MenuItem[] = [
  { icon: '🎯', label: 'Quản lý ngân sách', route: '/(tabs)/more/budget', description: 'Đặt giới hạn cho từng danh mục' },
  { icon: '💹', label: 'Tính lãi tiết kiệm', route: '/(tabs)/more/interest-calc', description: 'Ước tính lãi gửi tiết kiệm' },
  { icon: '🧮', label: 'Chia hóa đơn', route: '/(tabs)/more/split-calc', description: 'Chia bill cho nhóm bạn' },
];

const DATA_ITEMS: MenuItem[] = [
  { icon: '📥', label: 'Nhập CSV ngân hàng', route: '/(tabs)/more/csv-import', description: 'VietinBank, BIDV, Vietcombank' },
];

export default function MoreMenuScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = () => {
    Alert.alert('Đăng xuất?', 'Bạn có chắc muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with avatar */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName ?? 'Đang tải...'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/(tabs)/more/profile')}
            activeOpacity={0.75}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        <Section title="Tài khoản & Cài đặt" items={SETTINGS_ITEMS} />
        <Section title="Công cụ" items={TOOL_ITEMS} />
        <Section title="Dữ liệu" items={DATA_ITEMS} />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutLabel}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FinViet · Phiên bản 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, items }: { title: string; items: MenuItem[] }) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            style={[
              styles.row,
              idx < items.length - 1 && styles.rowDivider,
            ]}
            onPress={() => router.push(item.route as never)}
            activeOpacity={0.75}
          >
            <Text style={styles.rowIcon}>{item.icon}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              {item.description ? (
                <Text style={styles.rowSub}>{item.description}</Text>
              ) : null}
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
    backgroundColor: COLORS.brand[500],
    gap: SPACING[3],
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  userEmail: { fontSize: FONT_SIZE.xs, color: COLORS.brand[100], marginTop: 2 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { fontSize: 18 },

  section: { marginTop: SPACING[5], paddingHorizontal: SPACING[5] },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING[2],
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOW.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    gap: SPACING[3],
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  rowIcon: { fontSize: 22 },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },
  rowChevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING[6],
    marginHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING[2],
    ...SHADOW.sm,
  },
  logoutIcon: { fontSize: FONT_SIZE.lg },
  logoutLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.danger,
  },
  version: {
    marginTop: SPACING[6],
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
  },
});
