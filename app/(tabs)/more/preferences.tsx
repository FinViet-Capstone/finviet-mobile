import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useUser, useWallets, useUpdatePreferences } from '@/hooks';
import type { AppLanguage, AppTheme, NotificationSettings } from '@/types';
import type { Wallet } from '@/types/wallet';

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; flag: string }[] = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

const THEME_OPTIONS: { value: AppTheme; label: string; icon: string }[] = [
  { value: 'light', label: 'Sáng', icon: '☀️' },
  { value: 'dark', label: 'Tối', icon: '🌙' },
  { value: 'system', label: 'Hệ thống', icon: '⚙️' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { data: user, isLoading } = useUser();
  const { data: walletData } = useWallets();
  const updateMutation = useUpdatePreferences();

  const [language, setLanguage] = useState<AppLanguage>('vi');
  const [theme, setTheme] = useState<AppTheme>('system');
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    budget: true,
    report: true,
    goals: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dailyLimit, setDailyLimit] = useState('');

  useEffect(() => {
    if (!user) return;
    setLanguage(user.language);
    setTheme(user.theme);
    setDefaultWalletId(user.defaultWalletId);
    setNotifications(user.notifications);
    setDailyLimit(user.dailySpendLimit ? String(user.dailySpendLimit) : '');
  }, [user]);

  if (isLoading || !user) return <LoadingSpinner />;

  const wallets: Wallet[] = walletData?.wallets ?? [];
  const defaultWallet = wallets.find((w) => w.id === defaultWalletId);

  const handleSave = () => {
    const dailyNum = dailyLimit ? parseInt(dailyLimit, 10) : 0;
    updateMutation.mutate(
      {
        language,
        theme,
        defaultWalletId,
        notifications,
        dailySpendLimit: dailyNum > 0 ? dailyNum : null,
      },
      {
        onSuccess: () => Alert.alert('Đã lưu', 'Tùy chọn của bạn đã được cập nhật.'),
        onError: () => Alert.alert('Lỗi', 'Không lưu được tùy chọn.'),
      },
    );
  };

  const handleNotifToggle = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePickWallet = () => {
    if (wallets.length === 0) return;
    Alert.alert(
      'Chọn ví mặc định',
      'Ví được pre-select khi nhập giao dịch.',
      wallets.map((w) => ({
        text: w.name,
        onPress: () => setDefaultWalletId(w.id),
      })),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tùy chọn</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Language */}
        <Section title="Ngôn ngữ">
          {LANGUAGE_OPTIONS.map((opt) => (
            <SelectableRow
              key={opt.value}
              icon={opt.flag}
              label={opt.label}
              selected={language === opt.value}
              onPress={() => setLanguage(opt.value)}
            />
          ))}
        </Section>

        {/* Theme */}
        <Section title="Giao diện">
          {THEME_OPTIONS.map((opt) => (
            <SelectableRow
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={theme === opt.value}
              onPress={() => setTheme(opt.value)}
            />
          ))}
        </Section>

        {/* Default wallet */}
        <Section title="Ví mặc định">
          <TouchableOpacity
            style={styles.row}
            onPress={handlePickWallet}
            activeOpacity={0.75}
          >
            <Text style={styles.rowIcon}>👛</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Ví ưu tiên</Text>
              <Text style={styles.rowSub}>
                {defaultWallet?.name ?? 'Chưa chọn'}
              </Text>
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </Section>

        {/* Notifications */}
        <Section title="Thông báo đẩy">
          <ToggleRow
            label="Cảnh báo ngân sách"
            description="Khi đạt 80% giới hạn danh mục"
            value={notifications.budget}
            onToggle={() => handleNotifToggle('budget')}
          />
          <ToggleRow
            label="Báo cáo tuần"
            description="Sáng thứ Hai mỗi tuần"
            value={notifications.report}
            onToggle={() => handleNotifToggle('report')}
          />
          <ToggleRow
            label="Mục tiêu tiết kiệm"
            description="Khi đạt mốc tiến độ"
            value={notifications.goals}
            onToggle={() => handleNotifToggle('goals')}
          />
        </Section>

        {/* Advanced */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced((s) => !s)}
          activeOpacity={0.75}
        >
          <Text style={styles.advancedToggleLabel}>
            {showAdvanced ? '− Ẩn cài đặt nâng cao' : '+ Cài đặt nâng cao'}
          </Text>
        </TouchableOpacity>

        {showAdvanced ? (
          <Section title="Nâng cao">
            <View style={styles.advancedField}>
              <TextInput
                label="Hạn mức chi tiêu hàng ngày (VND)"
                value={dailyLimit}
                onChangeText={(t) => setDailyLimit(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="0 = không đặt"
              />
              <Text style={styles.advancedHint}>
                Khi không có ngân sách theo danh mục, lịch sẽ tô đỏ ngày vượt hạn mức này.
              </Text>
            </View>
          </Section>
        ) : null}

        <Button
          title="Lưu thay đổi"
          onPress={handleSave}
          loading={updateMutation.isPending}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SelectableRow({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, styles.rowLabelExpand]}>{label}</Text>
      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.gray[300], true: COLORS.brand[400] }}
        thumbColor={value ? COLORS.brand[500] : COLORS.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[12] },

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
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    gap: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  rowIcon: { fontSize: 22 },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[900],
  },
  rowLabelExpand: { flex: 1 },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },
  rowChevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[300] },
  checkmark: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.bold,
  },

  advancedToggle: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  advancedToggleLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.semibold,
  },

  advancedField: {
    padding: SPACING[4],
  },
  advancedHint: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
  },

  saveBtn: { marginHorizontal: SPACING[5], marginTop: SPACING[5] },
});
