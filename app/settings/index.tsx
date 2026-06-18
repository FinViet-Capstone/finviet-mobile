import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useCustomer, useUpdatePreferences } from '@/hooks/useCustomer';
import { useLogout } from '@/hooks';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Cài đặt',
  profile: {
    edit: 'Chỉnh sửa hồ sơ',
  },
  sections: {
    finance: 'Tài chính',
    notifications: 'Thông báo',
    app: 'Ứng dụng',
    account: 'Tài khoản',
  },
  rows: {
    income: 'Thu nhập hàng tháng',
    allocation: 'Phân bổ ngân sách',
    categories: 'Quản lý danh mục',
    pushNotif: 'Thông báo đẩy',
    budgetAlert: 'Cảnh báo ngân sách',
    weeklyReport: 'Báo cáo tuần',
    goalMilestone: 'Milestone tiết kiệm',
    language: 'Ngôn ngữ',
    currency: 'Đơn vị tiền tệ',
    theme: 'Giao diện',
    biometric: 'Bảo mật (Face ID)',
    password: 'Đổi mật khẩu',
    export: 'Xuất dữ liệu',
    subscription: 'Gói dịch vụ',
    categoryRequests: 'Yêu cầu danh mục',
    logout: 'Đăng xuất',
    deleteAccount: 'Xóa tài khoản',
  },
  values: {
    vnd: 'VND',
    dark: 'Tối',
    light: 'Sáng',
    system: 'Hệ thống',
    vi: 'Tiếng Việt',
    en: 'English',
    exportCsv: 'Xuất CSV',
  },
  logoutConfirmTitle: 'Đăng xuất?',
  logoutConfirmMsg: 'Bạn có chắc muốn đăng xuất khỏi FinViet?',
  logoutConfirm: 'Đăng xuất',
  cancel: 'Huỷ',
  version: 'Phiên bản 1.0.0',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.row}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? `${COLORS.error}15` : COLORS.surfaceVariant }]}>
        <MaterialIcon name={icon} size={20} color={iconColor ?? (danger ? COLORS.error : COLORS.onSurface)} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {rightElement ?? (onPress ? (
          <MaterialIcon name="chevron_right" size={18} color={COLORS.onSurfaceVariant} />
        ) : null)}
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon,
  iconColor,
  label,
  value,
  onToggle,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: COLORS.surfaceVariant }]}>
        <MaterialIcon name={icon} size={20} color={iconColor ?? COLORS.onSurface} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
        thumbColor={value ? COLORS.onPrimary : COLORS.onSurfaceVariant}
        ios_backgroundColor={COLORS.surfaceVariant}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { data: user, isLoading } = useCustomer();
  const updatePrefs = useUpdatePreferences();
  const logoutMutation = useLogout();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const notifBudget = user?.notifications?.budget ?? true;
  const notifReport = user?.notifications?.report ?? true;
  const notifGoals = user?.notifications?.goals ?? true;

  const handleToggleNotif = useCallback((key: 'budget' | 'report' | 'goals', val: boolean) => {
    updatePrefs.mutate({ notifications: { [key]: val } });
  }, [updatePrefs]);

  const handleLogout = useCallback(() => {
    setLogoutVisible(false);
    // Best-effort server-side revoke; the mutation clears the local session
    // in onSettled regardless of the network result.
    logoutMutation.mutate();
    router.replace('/');
  }, [logoutMutation, router]);

  const formatIncome = useCallback((income?: number | null) => {
    if (!income) return '—';
    if (income >= 1_000_000) return `${(income / 1_000_000).toFixed(0)}M đ/tháng`;
    return `${income.toLocaleString('vi-VN')} đ/tháng`;
  }, []);

  const allocationLabel = useCallback(() => {
    if (!user) return '50% · 30% · 20%';
    return `${user.needsPct ?? 50}% · ${user.wantsPct ?? 30}% · ${user.savingsPct ?? 20}%`;
  }, [user]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcon name="arrow_back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarPlaceholder}>
              <MaterialIcon name="person" size={40} color={COLORS.onSurfaceVariant} />
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.avatarEditBtn}>
              <MaterialIcon name="photo_camera" size={14} color={COLORS.primary} filled />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user?.displayName ?? '—'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>{S.profile.edit}</Text>
          </TouchableOpacity>
        </View>

        {/* Tài chính */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.finance}</Text>
          <SectionCard>
            <SettingsRow icon="payments" iconColor={COLORS.secondary}
              label={S.rows.income} value={formatIncome(user?.monthlyIncome)}
              onPress={() => {}} />
            <Divider />
            <SettingsRow icon="pie_chart" iconColor={COLORS.tertiary}
              label={S.rows.allocation} value={allocationLabel()}
              onPress={() => router.push({ pathname: '/settings/budget-allocation' })} />
            <Divider />
            <SettingsRow icon="category" iconColor={COLORS.primary}
              label={S.rows.categories}
              onPress={() => router.push({ pathname: '/settings/categories' })} />
            <Divider />
            <SettingsRow icon="playlist_add" iconColor={COLORS.secondary}
              label={S.rows.categoryRequests}
              onPress={() => router.push({ pathname: '/settings/category-requests' })} />
          </SectionCard>
        </View>

        {/* Thông báo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.notifications}</Text>
          <SectionCard>
            <ToggleRow icon="notifications" label={S.rows.pushNotif}
              value={notifBudget || notifReport || notifGoals}
              onToggle={(v) => {
                handleToggleNotif('budget', v);
                handleToggleNotif('report', v);
                handleToggleNotif('goals', v);
              }} />
            <Divider />
            <SettingsRow icon="warning" iconColor={COLORS.secondaryContainer}
              label={S.rows.budgetAlert} value="80% và 100%" onPress={() => {}} />
            <Divider />
            <ToggleRow icon="calendar_today" iconColor={COLORS.info}
              label={S.rows.weeklyReport} value={notifReport}
              onToggle={(v) => handleToggleNotif('report', v)} />
            <Divider />
            <ToggleRow icon="flag" iconColor={COLORS.tertiary}
              label={S.rows.goalMilestone} value={notifGoals}
              onToggle={(v) => handleToggleNotif('goals', v)} />
          </SectionCard>
        </View>

        {/* Ứng dụng */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.app}</Text>
          <SectionCard>
            <SettingsRow icon="language" label={S.rows.language}
              value={user?.language === 'en' ? S.values.en : S.values.vi} onPress={() => {}} />
            <Divider />
            <SettingsRow icon="currency_exchange" label={S.rows.currency}
              value={S.values.vnd} onPress={() => {}} />
            <Divider />
            <SettingsRow icon="dark_mode" label={S.rows.theme}
              value={user?.theme === 'light' ? S.values.light : user?.theme === 'dark' ? S.values.dark : S.values.system}
              onPress={() => {}} />
            <Divider />
            <ToggleRow icon="face" label={S.rows.biometric}
              value={false} onToggle={() => {}} />
          </SectionCard>
        </View>

        {/* Tài khoản */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.account}</Text>
          <SectionCard>
            <SettingsRow icon="workspace_premium" iconColor={COLORS.primary}
              label={S.rows.subscription}
              onPress={() => router.push({ pathname: '/settings/subscription' })} />
            <Divider />
            <SettingsRow icon="key" label={S.rows.password} onPress={() => {}} />
            <Divider />
            <SettingsRow icon="download" label={S.rows.export}
              value={S.values.exportCsv}
              onPress={() => router.push({ pathname: '/settings/export' })} />
            <Divider />
            <SettingsRow icon="logout" label={S.rows.logout}
              danger onPress={() => setLogoutVisible(true)} />
            <Divider />
            <SettingsRow icon="delete_forever" label={S.rows.deleteAccount}
              danger iconColor={COLORS.danger}
              onPress={() => router.push({ pathname: '/settings/delete-account' })} />
          </SectionCard>
        </View>

        <Text style={styles.version}>{S.version}</Text>
      </ScrollView>

      {/* Logout confirm */}
      <Modal visible={logoutVisible} transparent animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1}
          onPress={() => setLogoutVisible(false)} />
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{S.logoutConfirmTitle}</Text>
          <Text style={styles.confirmMsg}>{S.logoutConfirmMsg}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn}
              onPress={() => setLogoutVisible(false)}>
              <Text style={styles.cancelText}>{S.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.logoutBtn}
              onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>{S.logoutConfirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface, flex: 1, textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[4] },
  // Profile
  profileSection: { alignItems: 'center', paddingTop: SPACING[2], paddingBottom: SPACING[4], gap: SPACING[2] },
  avatarWrap: { position: 'relative', marginBottom: SPACING[2] },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 2, borderColor: COLORS.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 2, borderColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  profileEmail: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  editProfileBtn: {
    paddingHorizontal: SPACING[6], paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.outlineVariant,
    marginTop: SPACING[2],
  },
  editProfileText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },
  // Sections
  section: { gap: SPACING[2] },
  sectionLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary, textTransform: 'uppercase',
    letterSpacing: 0.8, paddingLeft: SPACING[2],
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS['2xl'],
    paddingVertical: SPACING[1],
    borderWidth: 1, borderColor: `${COLORS.outlineVariant}50`,
  },
  divider: {
    height: 1, backgroundColor: COLORS.surfaceVariant,
    marginHorizontal: SPACING[4], opacity: 0.5,
  },
  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING[3], paddingVertical: SPACING[3],
    minHeight: 56, gap: SPACING[3],
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.onSurface },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  rowValue: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  // Version
  version: { fontSize: 11, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingVertical: SPACING[4] },
  // Logout confirm
  modalBackdrop: { flex: 1, backgroundColor: `${COLORS.black}80` },
  confirmDialog: {
    position: 'absolute', top: '35%', left: SPACING[6], right: SPACING[6],
    backgroundColor: COLORS.surfaceContainerHigh, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[6], gap: SPACING[3], borderWidth: 1, borderColor: COLORS.outlineVariant,
  },
  confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  confirmMsg: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[2] },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.onSurfaceVariant },
  logoutBtn: {
    flex: 2, height: 48, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.errorContainer, alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.onErrorContainer },
});
