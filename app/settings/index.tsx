import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChangePasswordSheet } from '@/components/auth/ChangePasswordSheet';
import { EditProfileSheet } from '@/components/settings';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { useCustomer, useUpdatePreferences } from '@/hooks/useCustomer';
import { useLogout, useEffectiveIncomeAllocation, useUploadAvatar } from '@/hooks';
import { getApiErrorMessage } from '@/utils/errors';

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
    theme: 'Giao diện',
    password: 'Đổi mật khẩu',
    export: 'Xuất dữ liệu',
    subscription: 'Gói dịch vụ',
    logout: 'Đăng xuất',
    deleteAccount: 'Xóa tài khoản',
  },
  values: {
    dark: 'Tối',
    light: 'Sáng',
    system: 'Hệ thống',
    exportCsv: 'Xuất CSV',
  },
  themePickerTitle: 'Giao diện',
  logoutConfirmTitle: 'Đăng xuất?',
  logoutConfirmMsg: 'Bạn có chắc muốn đăng xuất khỏi FinViet?',
  logoutConfirm: 'Đăng xuất',
  cancel: 'Huỷ',
  version: 'Phiên bản 1.0.0',
};

type ThemePref = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { id: ThemePref; label: string; icon: string }[] = [
  { id: 'light', label: S.values.light, icon: 'light_mode' },
  { id: 'dark', label: S.values.dark, icon: 'dark_mode' },
  { id: 'system', label: S.values.system, icon: 'smartphone' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.row}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.error}15` : colors.surfaceVariant }]}>
        <MaterialIcon name={icon} size={20} color={iconColor ?? (danger ? colors.error : colors.onSurface)} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.error }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {rightElement ?? (onPress ? (
          <MaterialIcon name="chevron_right" size={18} color={colors.onSurfaceVariant} />
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceVariant }]}>
        <MaterialIcon name={icon} size={20} color={iconColor ?? colors.onSurface} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.onSurfaceVariant}
        ios_backgroundColor={colors.surfaceVariant}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: user, isLoading } = useCustomer();
  const { data: effectiveAllocation } = useEffectiveIncomeAllocation();
  const updatePrefs = useUpdatePreferences();
  const logoutMutation = useLogout();
  const uploadAvatar = useUploadAvatar();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);

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
    // Go straight to the auth stack. Routing through '/' would re-evaluate the
    // gate while clearSession() is still pending in the mutation's onSettled,
    // so isAuthenticated is briefly still true → it would bounce back to Home.
    router.replace('/(auth)');
  }, [logoutMutation, router]);

  const formatIncome = useCallback((income?: number | null) => {
    if (!income) return '—';
    if (income >= 1_000_000) return `${(income / 1_000_000).toFixed(0)}M đ/tháng`;
    return `${income.toLocaleString('vi-VN')} đ/tháng`;
  }, []);

  const allocationLabel = useCallback(() => {
    if (!effectiveAllocation) return '50% · 30% · 20%';
    return `${effectiveAllocation.needsPct}% · ${effectiveAllocation.wantsPct}% · ${effectiveAllocation.savingsPct}%`;
  }, [effectiveAllocation]);

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Thư viện ảnh chưa được cấp quyền. Vui lòng cấp quyền trong Cài đặt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    uploadAvatar.mutate(result.assets[0].uri, {
      onError: (err) => Alert.alert('', getApiErrorMessage(err, 'Không thể tải ảnh lên.')),
    });
  }, [uploadAvatar]);

  const handleSelectTheme = useCallback((theme: ThemePref) => {
    setThemePickerVisible(false);
    updatePrefs.mutate({ theme });
  }, [updatePrefs]);

  if (isLoading) return <LoadingSpinner />;

  const themeValue = user?.theme === 'light' ? S.values.light : user?.theme === 'dark' ? S.values.dark : S.values.system;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.headerBtn}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name="arrow_back" size={22} color={colors.onSurface} />
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
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <MaterialIcon name="person" size={40} color={colors.onSurfaceVariant} />
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.avatarEditBtn}
              onPress={handlePickAvatar}
              disabled={uploadAvatar.isPending}
            >
              <MaterialIcon name="photo_camera" size={14} color={colors.primary} filled />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user?.displayName ?? '—'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.editProfileBtn} onPress={() => setEditProfileVisible(true)}>
            <Text style={styles.editProfileText}>{S.profile.edit}</Text>
          </TouchableOpacity>
        </View>

        {/* Tài chính */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.finance}</Text>
          <SectionCard>
            <SettingsRow icon="payments" iconColor={colors.secondary}
              label={S.rows.income} value={formatIncome(effectiveAllocation?.monthlyIncome)}
              onPress={() => router.push({ pathname: '/settings/budget-allocation' })} />
            <Divider />
            <SettingsRow icon="pie_chart" iconColor={colors.tertiary}
              label={S.rows.allocation} value={allocationLabel()}
              onPress={() => router.push({ pathname: '/settings/budget-allocation' })} />
            <Divider />
            <SettingsRow icon="category" iconColor={colors.primary}
              label={S.rows.categories}
              onPress={() => router.push({ pathname: '/settings/categories' })} />
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
            <SettingsRow icon="warning" iconColor={colors.secondaryContainer}
              label={S.rows.budgetAlert} value="80% và 100%"
              rightElement={
                <Switch
                  value={notifBudget}
                  onValueChange={(v) => handleToggleNotif('budget', v)}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                  thumbColor={notifBudget ? colors.onPrimary : colors.onSurfaceVariant}
                  ios_backgroundColor={colors.surfaceVariant}
                />
              } />
            <Divider />
            <ToggleRow icon="calendar_today" iconColor={colors.info}
              label={S.rows.weeklyReport} value={notifReport}
              onToggle={(v) => handleToggleNotif('report', v)} />
            <Divider />
            <ToggleRow icon="flag" iconColor={colors.tertiary}
              label={S.rows.goalMilestone} value={notifGoals}
              onToggle={(v) => handleToggleNotif('goals', v)} />
          </SectionCard>
        </View>

        {/* Ứng dụng */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.app}</Text>
          <SectionCard>
            <SettingsRow icon="dark_mode" label={S.rows.theme}
              value={themeValue}
              onPress={() => setThemePickerVisible(true)} />
          </SectionCard>
        </View>

        {/* Tài khoản */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{S.sections.account}</Text>
          <SectionCard>
            <SettingsRow icon="workspace_premium" iconColor={colors.primary}
              label={S.rows.subscription}
              onPress={() => router.push({ pathname: '/settings/subscription' })} />
            <Divider />
            <SettingsRow icon="key" label={S.rows.password} onPress={() => setPasswordVisible(true)} />
            <Divider />
            <SettingsRow icon="download" label={S.rows.export}
              value={S.values.exportCsv}
              onPress={() => router.push({ pathname: '/settings/export' })} />
            <Divider />
            <SettingsRow icon="logout" label={S.rows.logout}
              danger onPress={() => setLogoutVisible(true)} />
            <Divider />
            <SettingsRow icon="delete_forever" label={S.rows.deleteAccount}
              danger iconColor={colors.danger}
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

      {/* Theme picker */}
      <Modal visible={themePickerVisible} transparent animationType="fade"
        onRequestClose={() => setThemePickerVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1}
          onPress={() => setThemePickerVisible(false)} />
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{S.themePickerTitle}</Text>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((opt) => {
              const selected = (user?.theme ?? 'system') === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.themeOptionRow, selected && styles.themeOptionRowSelected]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectTheme(opt.id)}
                >
                  <MaterialIcon name={opt.icon} size={20} color={selected ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.themeOptionText, selected && { color: colors.primary, fontWeight: FONT_WEIGHT.semibold }]}>
                    {opt.label}
                  </Text>
                  {selected && <MaterialIcon name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <ChangePasswordSheet visible={passwordVisible} onClose={() => setPasswordVisible(false)} />
      <EditProfileSheet
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        currentName={user?.displayName ?? ''}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface, flex: 1, textAlign: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12], gap: SPACING[4] },
    // Profile
    profileSection: { alignItems: 'center', paddingTop: SPACING[2], paddingBottom: SPACING[4], gap: SPACING[2] },
    avatarWrap: { position: 'relative', marginBottom: SPACING[2] },
    avatarPlaceholder: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: colors.surfaceContainerHigh,
      borderWidth: 2, borderColor: colors.surfaceVariant,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 96, height: 96,
    },
    avatarEditBtn: {
      position: 'absolute', bottom: 0, right: 0,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 2, borderColor: colors.background,
      alignItems: 'center', justifyContent: 'center',
    },
    profileName: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    profileEmail: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
    editProfileBtn: {
      paddingHorizontal: SPACING[6], paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: colors.outlineVariant,
      marginTop: SPACING[2],
    },
    editProfileText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },
    // Sections
    section: { gap: SPACING[2] },
    sectionLabel: {
      fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
      color: colors.primary, textTransform: 'uppercase',
      letterSpacing: 0.8, paddingLeft: SPACING[2],
    },
    card: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: BORDER_RADIUS['2xl'],
      paddingVertical: SPACING[1],
      borderWidth: 1, borderColor: `${colors.outlineVariant}50`,
    },
    divider: {
      height: 1, backgroundColor: colors.surfaceVariant,
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
    rowLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.onSurface },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
    rowValue: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant },
    // Version
    version: { fontSize: 11, color: colors.onSurfaceVariant, textAlign: 'center', paddingVertical: SPACING[4] },
    // Logout confirm / theme picker dialog
    modalBackdrop: { flex: 1, backgroundColor: `${colors.black}80` },
    confirmDialog: {
      position: 'absolute', top: '35%', left: SPACING[6], right: SPACING[6],
      backgroundColor: colors.surfaceContainerHigh, borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[6], gap: SPACING[3], borderWidth: 1, borderColor: colors.outlineVariant,
    },
    confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    confirmMsg: { fontSize: FONT_SIZE.sm, color: colors.onSurfaceVariant, lineHeight: 20 },
    confirmActions: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[2] },
    cancelBtn: {
      flex: 1, height: 48, borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1, borderColor: colors.outlineVariant,
      alignItems: 'center', justifyContent: 'center',
    },
    cancelText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurfaceVariant },
    logoutBtn: {
      flex: 2, height: 48, borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.errorContainer, alignItems: 'center', justifyContent: 'center',
    },
    logoutBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: colors.onErrorContainer },
    // Theme picker options
    themeOptions: { gap: SPACING[1] },
    themeOptionRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
      paddingVertical: SPACING[3], paddingHorizontal: SPACING[2],
      borderRadius: BORDER_RADIUS.lg,
    },
    themeOptionRowSelected: {
      backgroundColor: `${colors.primary}1A`,
    },
    themeOptionText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.onSurface },
  });
}
