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

import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { WalletType } from '@/types/wallet';
import { useAuthStore } from '@/stores/authStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const MOCK_FEATURES = [
  { key: 'f1', icon: '📊', text: 'Theo dõi chi tiêu theo danh mục' },
  { key: 'f2', icon: '🤖', text: 'AI phân tích và tư vấn tài chính' },
  { key: 'f3', icon: '🎯', text: 'Quản lý ngân sách và mục tiêu tiết kiệm' },
];

const WALLET_TYPE_OPTIONS: { type: WalletType; icon: string; label: string }[] =
  [
    { type: 'cash', icon: '💵', label: 'Tiền mặt' },
    { type: 'momo', icon: '📱', label: 'MoMo' },
    { type: 'bank_account', icon: '🏦', label: 'Ngân hàng' },
  ];

// ---------------------------------------------------------------------------
// Step indicator component
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={indicatorStyles.row}>
      {Array.from({ length: total }).map((_, idx) => (
        <View
          key={idx}
          style={[
            indicatorStyles.dot,
            idx + 1 === current
              ? indicatorStyles.dotActive
              : indicatorStyles.dotInactive,
          ]}
        />
      ))}
      <Text style={indicatorStyles.label}>
        {current} / {total}
      </Text>
    </View>
  );
}

const indicatorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
  dotInactive: {
    backgroundColor: COLORS.brand[300],
  },
  label: {
    marginLeft: SPACING[2],
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.brand[100],
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const router = useRouter();
  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const goToStep2 = () => setStep(2);

  const goToStep3 = () => setStep(3);

  const handleFinish = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      markOnboardingDone();
      router.replace('/(tabs)/report');
    }, 500);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const canFinish = walletName.trim().length > 0;

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderNavBar = () => {
    if (step === 1) {
      return (
        <View style={styles.navBar}>
          <StepIndicator current={step} total={3} />
        </View>
      );
    }
    return (
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <StepIndicator current={step} total={3} />
        </View>
        {/* Spacer to balance back button */}
        <View style={styles.navSpacer} />
      </View>
    );
  };

  // ── Step 1 — Welcome ──────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoEmoji}>💰</Text>
      </View>
      <Text style={styles.appName}>FinViet</Text>
      <Text style={styles.tagline}>
        Quản lý tài chính thông minh hơn mỗi ngày
      </Text>

      <View style={styles.featureList}>
        {MOCK_FEATURES.map((item) => (
          <View key={item.key} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Button
          title="Bắt đầu"
          onPress={goToStep2}
          style={styles.primaryAction}
        />
        <Text style={styles.step1Note}>
          Chỉ mất 1 phút để thiết lập tài khoản của bạn
        </Text>
      </View>
    </View>
  );

  // ── Step 2 — Monthly Income ───────────────────────────────────────────────

  const renderStep2 = () => (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHero}>
          <View style={styles.stepIconCircle}>
            <Text style={styles.stepIconEmoji}>💼</Text>
          </View>
          <Text style={styles.stepTitle}>Thu nhập của bạn</Text>
          <Text style={styles.stepSubtitle}>
            Thu nhập hàng tháng của bạn là bao nhiêu?
          </Text>
        </View>

        <View style={styles.card}>
          <TextInput
            label="Thu nhập hàng tháng (VND)"
            placeholder="VD: 10000000"
            keyboardType="numeric"
            returnKeyType="done"
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            leftIcon={<Text style={styles.fieldIcon}>₫</Text>}
            containerStyle={styles.fieldSpacing}
          />
          <Text style={styles.incomeHint}>
            Thông tin này giúp AI đưa ra lời khuyên tài chính phù hợp hơn.
          </Text>

          <Button
            title="Tiếp tục"
            onPress={goToStep3}
            style={styles.primaryAction}
          />

          <TouchableOpacity
            onPress={goToStep3}
            style={styles.skipRow}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.skipLabel}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Step 3 — Create First Wallet ──────────────────────────────────────────

  const renderStep3 = () => (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHero}>
          <View style={styles.stepIconCircle}>
            <Text style={styles.stepIconEmoji}>👛</Text>
          </View>
          <Text style={styles.stepTitle}>Tạo ví đầu tiên</Text>
          <Text style={styles.stepSubtitle}>
            Đặt tên cho ví và chọn loại ví để bắt đầu theo dõi tài chính.
          </Text>
        </View>

        <View style={styles.card}>
          {/* Wallet name */}
          <TextInput
            label="Tên ví"
            placeholder="VD: Ví tiền mặt chính"
            autoCapitalize="words"
            returnKeyType="next"
            value={walletName}
            onChangeText={setWalletName}
            leftIcon={<Text style={styles.fieldIcon}>✏️</Text>}
            containerStyle={styles.fieldSpacing}
          />

          {/* Wallet type chips */}
          <Text style={styles.typeLabel}>Loại ví</Text>
          <View style={styles.typeChipRow}>
            {WALLET_TYPE_OPTIONS.map((opt) => {
              const isSelected = walletType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.typeChip,
                    isSelected
                      ? styles.typeChipSelected
                      : styles.typeChipDefault,
                  ]}
                  onPress={() => setWalletType(opt.type)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.typeChipIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.typeChipLabel,
                      isSelected
                        ? styles.typeChipLabelSelected
                        : styles.typeChipLabelDefault,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Initial balance */}
          <TextInput
            label="Số dư ban đầu (VND)"
            placeholder="0"
            keyboardType="numeric"
            returnKeyType="done"
            value={initialBalance}
            onChangeText={setInitialBalance}
            leftIcon={<Text style={styles.fieldIcon}>₫</Text>}
            containerStyle={styles.fieldSpacingLg}
          />

          <Button
            title="Hoàn thành"
            onPress={handleFinish}
            loading={loading}
            disabled={!canFinish}
            style={styles.primaryAction}
          />

          {!canFinish && (
            <Text style={styles.disabledHint}>
              Vui lòng nhập tên ví để tiếp tục
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderNavBar()}

      {step === 1 && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStep1()}
        </ScrollView>
      )}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Root
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

  // Nav bar
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
    backgroundColor: COLORS.brand[400],
  },
  backArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navSpacer: {
    width: 40,
  },

  // Step 1 — Welcome
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
    paddingTop: SPACING[8],
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
    ...SHADOW.md,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: SPACING[2],
  },
  tagline: {
    fontSize: FONT_SIZE.base,
    color: COLORS.brand[100],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING[8],
  },

  // Feature list
  featureList: {
    alignSelf: 'stretch',
    marginBottom: SPACING[6],
    gap: SPACING[3],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.brand[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: FONT_SIZE.lg,
  },
  featureText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Step 1 note
  step1Note: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
    textAlign: 'center',
  },

  // Steps 2 & 3 — Hero section (inside scroll)
  stepHero: {
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[8],
  },
  stepIconCircle: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
    ...SHADOW.md,
  },
  stepIconEmoji: {
    fontSize: 32,
  },
  stepTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    textAlign: 'center',
    lineHeight: 22,
  },

  // White card
  card: {
    marginHorizontal: SPACING[4],
    marginTop: -SPACING[2],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[6],
    ...SHADOW.lg,
  },

  // Fields
  fieldSpacing: {
    marginBottom: SPACING[4],
  },
  fieldSpacingLg: {
    marginBottom: SPACING[5],
  },
  fieldIcon: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[500],
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Income hint
  incomeHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
    lineHeight: 18,
    marginBottom: SPACING[5],
    marginTop: -SPACING[2],
  },

  // Buttons
  primaryAction: {
    marginBottom: SPACING[3],
  },
  skipRow: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  skipLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[400],
  },

  // Wallet type chips
  typeLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[700],
    marginBottom: SPACING[3],
  },
  typeChipRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[5],
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    gap: SPACING[1],
  },
  typeChipDefault: {
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[50],
  },
  typeChipSelected: {
    borderColor: COLORS.brand[500],
    backgroundColor: COLORS.brand[50],
  },
  typeChipIcon: {
    fontSize: FONT_SIZE.xl,
  },
  typeChipLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  typeChipLabelDefault: {
    color: COLORS.gray[600],
  },
  typeChipLabelSelected: {
    color: COLORS.brand[600],
  },

  // Disabled hint
  disabledHint: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[400],
    textAlign: 'center',
  },
});
