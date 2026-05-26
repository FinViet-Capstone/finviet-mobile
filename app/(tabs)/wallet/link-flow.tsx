import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
  Modal,
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
import { mockLinkBankAccount } from '@/services/linkedWalletSync';

type FlowStep = 'intro' | 'select-bank' | 'credentials' | 'connecting' | 'success';

interface Institution {
  id: string;
  name: string;
  domain: string;
}

const MOCK_INSTITUTIONS: Institution[] = [
  { id: 'testbank', name: 'Testbank', domain: 'testbank.com' },
  { id: 'acb_personal', name: 'ACB - Personal', domain: 'acb.com.vn' },
  { id: 'bochk_personal', name: 'Bank of China (HK) - Personal', domain: 'its.bochk.com' },
  { id: 'bea_personal', name: 'Bank of East Asia (HK) - Personal', domain: 'www.hkbea-cyberbanking.com' },
  { id: 'klikbca_personal', name: 'BCA (KlikBCA) - Personal', domain: 'ibank.klikbca.com' },
];

export default function LinkFlowScreen() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('intro');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);

  const handleContinueFromIntro = () => {
    setStep('select-bank');
  };

  const handleSelectInstitution = (institution: Institution) => {
    setSelectedInstitution(institution);
    setStep('credentials');
  };

  const handleBack = () => {
    if (step === 'select-bank') {
      setStep('intro');
    } else if (step === 'credentials') {
      setStep('select-bank');
      setSelectedInstitution(null);
      setUsername('');
      setPassword('');
    }
  };

  const handleAuthenticate = async () => {
    if (!username.trim() || !password.trim() || !selectedInstitution) {
      return;
    }

    setLoading(true);
    setStep('connecting');

    try {
      const result = await mockLinkBankAccount(
        selectedInstitution.id,
        selectedInstitution.name,
        username,
        password,
      );
      setSyncedCount(result.transactionsSynced);
      setStep('success');
    } catch (err) {
      console.error('Link failed:', err);
      setStep('credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    router.replace('/(tabs)/wallet');
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        {step !== 'success' && step !== 'connecting' && (
          <View style={styles.header}>
            {step !== 'intro' && (
              <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
                <Text style={styles.headerIcon}>‹</Text>
              </TouchableOpacity>
            )}
            {step === 'intro' && <View style={styles.headerBtn} />}
            <Text style={styles.headerTitle}>Demo</Text>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Intro Step */}
        {step === 'intro' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.introContainer}>
              <Text style={styles.introTitle}>Data API</Text>
              <Text style={styles.introSubtitle}>
                Link an account and access real-time financial data
              </Text>

              <Button
                title="LINK A BANK ACCOUNT"
                onPress={handleContinueFromIntro}
                style={styles.linkBtn}
              />

              <View style={styles.securitySection}>
                <View style={styles.securityItem}>
                  <Text style={styles.securityIcon}>🔒</Text>
                  <View style={styles.securityTextContainer}>
                    <Text style={styles.securityTitle}>Secure</Text>
                    <Text style={styles.securityDesc}>
                      Finverse uses multiple security layers to protect your data.
                    </Text>
                  </View>
                </View>

                <View style={styles.securityItem}>
                  <Text style={styles.securityIcon}>🏢</Text>
                  <View style={styles.securityTextContainer}>
                    <Text style={styles.securityTitle}>Controlled access (read-only)</Text>
                    <Text style={styles.securityDesc}>
                      Finverse accesses data only with your permission and will not modify your accounts or make payments.
                    </Text>
                  </View>
                </View>

                <View style={styles.securityItem}>
                  <Text style={styles.securityIcon}>🛡️</Text>
                  <View style={styles.securityTextContainer}>
                    <Text style={styles.securityTitle}>Privacy first</Text>
                    <Text style={styles.securityDesc}>
                      Finverse shares your data only to this application. Finverse will not retain your data, or share it to third parties.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.poweredBy}>
                <Text style={styles.poweredByText}>Powered by:</Text>
                <Text style={styles.finverseLogo}>Finverse</Text>
              </View>

              <Text style={styles.termsText}>
                By selecting "Continue" you agree to{'\n'}
                <Text style={styles.termsLink}>Finverse's Terms of Use and Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Select Bank Step */}
        {step === 'select-bank' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.stepTitle}>Select your financial institution</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Location:</Text>
              <Text style={styles.locationValue}>All</Text>
            </View>

            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search institution..."
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            {MOCK_INSTITUTIONS.map((institution) => (
              <TouchableOpacity
                key={institution.id}
                style={styles.institutionCard}
                onPress={() => handleSelectInstitution(institution)}
                activeOpacity={0.7}
              >
                <View style={styles.institutionIcon}>
                  <Text style={styles.institutionIconText}>🏦</Text>
                </View>
                <View style={styles.institutionInfo}>
                  <Text style={styles.institutionName}>{institution.name}</Text>
                  <Text style={styles.institutionDomain}>{institution.domain}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Credentials Step */}
        {step === 'credentials' && selectedInstitution && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.bankHeader}>
              <View style={styles.bankIconLarge}>
                <Text style={styles.bankIconLargeText}>🏦</Text>
              </View>
              <Text style={styles.bankName}>{selectedInstitution.name}</Text>
            </View>

            <View style={styles.credentialsCard}>
              <Text style={styles.credentialsTitle}>Enter your credentials</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>User ID</Text>
                <RNTextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <RNTextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.autoRefreshRow}>
                <View style={styles.checkbox} />
                <Text style={styles.autoRefreshText}>Automatic data refresh</Text>
                <TouchableOpacity>
                  <Text style={styles.infoIcon}>?</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Login"
                onPress={handleAuthenticate}
                disabled={!username.trim() || !password.trim()}
                style={styles.loginBtn}
              />
            </View>

            <View style={styles.managedBy}>
              <Text style={styles.managedByText}>This connection is managed by</Text>
              <Text style={styles.finverseLogoSmall}>Finverse</Text>
              <TouchableOpacity>
                <Text style={styles.learnMore}>Learn more</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Connecting Step */}
        {step === 'connecting' && selectedInstitution && (
          <View style={styles.connectingContainer}>
            <View style={styles.bankIconLarge}>
              <Text style={styles.bankIconLargeText}>🏦</Text>
            </View>
            <ActivityIndicator size="large" color={COLORS.brand[500]} style={styles.spinner} />
            <Text style={styles.connectingTitle}>Connecting...</Text>
            <Text style={styles.connectingSubtitle}>Thank you for your patience!</Text>
            <Text style={styles.connectingNote}>This can take up to 1 minute.</Text>
            <Text style={styles.connectingWarning}>
              Please do not use your institution's mobile app or online portal to login at the same time, since this may interrupt our connection.
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Liên kết thành công!</Text>
            <Text style={styles.successMessage}>
              Đã đồng bộ {syncedCount} giao dịch từ tài khoản ngân hàng của bạn.
            </Text>
            <Button
              title="Xem giao dịch"
              onPress={handleFinish}
              style={styles.finishBtn}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  closeIcon: { fontSize: 24, color: COLORS.gray[700] },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[700],
  },

  // Intro
  introContainer: { alignItems: 'center', paddingTop: SPACING[12] },
  introTitle: {
    fontSize: 36,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[700],
    marginBottom: SPACING[2],
  },
  introSubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: SPACING[8],
  },
  linkBtn: {
    backgroundColor: COLORS.brand[500],
    paddingHorizontal: SPACING[8],
    marginBottom: SPACING[8],
  },
  securitySection: { width: '100%', gap: SPACING[6], marginBottom: SPACING[8] },
  securityItem: { flexDirection: 'row', gap: SPACING[3], alignItems: 'flex-start' },
  securityIcon: { fontSize: 24 },
  securityTextContainer: { flex: 1 },
  securityTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
    marginBottom: SPACING[1],
  },
  securityDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  poweredBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  poweredByText: { fontSize: FONT_SIZE.sm, color: COLORS.gray[600] },
  finverseLogo: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  termsText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: { color: COLORS.brand[500], textDecorationLine: 'underline' },

  // Select Bank
  stepTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[4],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  locationLabel: { fontSize: FONT_SIZE.sm, color: COLORS.gray[600] },
  locationValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
  },
  searchContainer: { marginBottom: SPACING[4] },
  searchInput: {
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
  },
  institutionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[3],
  },
  institutionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  institutionIconText: { fontSize: FONT_SIZE.xl },
  institutionInfo: { flex: 1 },
  institutionName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
    marginBottom: SPACING[1],
  },
  institutionDomain: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },
  chevron: { fontSize: 24, color: COLORS.gray[400] },

  // Credentials
  bankHeader: { alignItems: 'center', marginBottom: SPACING[6] },
  bankIconLarge: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  bankIconLargeText: { fontSize: 48 },
  bankName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  credentialsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[6],
  },
  credentialsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[5],
  },
  inputGroup: { marginBottom: SPACING[4] },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[700],
    marginBottom: SPACING[2],
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: SPACING[12] },
  eyeIcon: {
    position: 'absolute',
    right: SPACING[3],
    top: SPACING[3],
    padding: SPACING[1],
  },
  eyeIconText: {
    fontSize: FONT_SIZE.lg,
  },
  autoRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[5],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 4,
  },
  autoRefreshText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.gray[700] },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray[300],
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    lineHeight: 20,
  },
  loginBtn: { marginTop: SPACING[2] },
  managedBy: { alignItems: 'center', gap: SPACING[2] },
  managedByText: { fontSize: FONT_SIZE.sm, color: COLORS.gray[600] },
  finverseLogoSmall: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  learnMore: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    textDecorationLine: 'underline',
  },

  // Connecting
  connectingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[8],
  },
  spinner: { marginVertical: SPACING[6] },
  connectingTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    marginBottom: SPACING[2],
  },
  connectingSubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[700],
    marginBottom: SPACING[1],
  },
  connectingNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING[6],
  },
  connectingWarning: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[8],
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[6],
  },
  successIconText: {
    fontSize: 60,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  successTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[3],
  },
  successMessage: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: SPACING[8],
    lineHeight: 24,
  },
  finishBtn: { minWidth: 200 },
});
