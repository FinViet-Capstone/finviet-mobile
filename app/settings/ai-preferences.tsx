import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomSlider } from '@/components/common/CustomSlider';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import {
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from '@/constants/theme';
import { AI_PREFERENCES_STRINGS as S } from '@/data/settingsScreensData';
import { useAiPreferences, useUpdateAiPreferences } from '@/hooks';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import type {
  AiPreferences,
  CategorizationMode,
  UpdateAiPreferencesInput,
} from '@/services';
import { getApiErrorMessage } from '@/utils/errors';

interface CategorizationOption {
  value: CategorizationMode;
  icon: string;
  label: string;
  description: string;
}

interface PreferenceSwitchRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  isDisabled: boolean;
  isPending: boolean;
  onValueChange: (value: boolean) => void;
}

const MIN_THRESHOLD = 0.5;
const MAX_THRESHOLD = 1;
const THRESHOLD_STEP = 0.05;

const CATEGORIZATION_OPTIONS: CategorizationOption[] = [
  { value: 'off', icon: 'block', ...S.modes.off },
  { value: 'suggest_only', icon: 'lightbulb', ...S.modes.suggest_only },
  {
    value: 'high_confidence_auto',
    icon: 'auto_awesome',
    ...S.modes.high_confidence_auto,
  },
];

const EXPERIENCE_ROWS: Array<{
  key: 'defaultHistoryEnabled' | 'weeklyReportEnabled' | 'ragEnabled';
  icon: string;
  label: string;
  description: string;
}> = [
  { key: 'defaultHistoryEnabled', icon: 'history', ...S.experience.defaultHistoryEnabled },
  { key: 'weeklyReportEnabled', icon: 'calendar_today', ...S.experience.weeklyReportEnabled },
  { key: 'ragEnabled', icon: 'neurology', ...S.experience.ragEnabled },
];

const DATA_SCOPE_ROWS: Array<{
  key: 'shareBalances' | 'shareTransactions' | 'shareBudgets' | 'shareGoals' | 'shareReports';
  icon: string;
  label: string;
}> = [
  { key: 'shareBalances', icon: 'account_balance_wallet', label: S.dataScope.shareBalances },
  { key: 'shareTransactions', icon: 'receipt_long', label: S.dataScope.shareTransactions },
  { key: 'shareBudgets', icon: 'pie_chart', label: S.dataScope.shareBudgets },
  { key: 'shareGoals', icon: 'flag', label: S.dataScope.shareGoals },
  { key: 'shareReports', icon: 'description', label: S.dataScope.shareReports },
];

export default function AiPreferencesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: preferences, isLoading, isError, refetch } = useAiPreferences();
  const updatePreferences = useUpdateAiPreferences();
  const [thresholdDraft, setThresholdDraft] = useState(0.85);
  const [pendingField, setPendingField] = useState<keyof AiPreferences | null>(null);

  useEffect(() => {
    if (preferences) setThresholdDraft(preferences.autoCategorizationThreshold);
  }, [preferences]);

  const savePatch = useCallback(async (
    field: keyof AiPreferences,
    patch: UpdateAiPreferencesInput,
  ) => {
    if (pendingField) return false;
    setPendingField(field);
    try {
      await updatePreferences.mutateAsync(patch);
      return true;
    } catch (error) {
      Alert.alert('', getApiErrorMessage(error, S.saveError));
      return false;
    } finally {
      setPendingField(null);
    }
  }, [pendingField, updatePreferences]);

  const handleModeChange = useCallback((mode: CategorizationMode) => {
    if (!preferences || mode === preferences.categorizationMode) return;
    savePatch('categorizationMode', { categorizationMode: mode });
  }, [preferences, savePatch]);

  const handleSwitchChange = useCallback((
    field: keyof Pick<
      AiPreferences,
      | 'defaultHistoryEnabled'
      | 'weeklyReportEnabled'
      | 'ragEnabled'
      | 'shareBalances'
      | 'shareTransactions'
      | 'shareBudgets'
      | 'shareGoals'
      | 'shareReports'
    >,
    value: boolean,
  ) => {
    savePatch(field, { [field]: value });
  }, [savePatch]);

  const commitThreshold = useCallback(async (value: number) => {
    if (!preferences || value === preferences.autoCategorizationThreshold) return;
    const didSave = await savePatch('autoCategorizationThreshold', {
      autoCategorizationThreshold: value,
    });
    if (!didSave) setThresholdDraft(preferences.autoCategorizationThreshold);
  }, [preferences, savePatch]);

  const changeThresholdByStep = useCallback((delta: number) => {
    const next = Math.min(
      MAX_THRESHOLD,
      Math.max(MIN_THRESHOLD, Math.round((thresholdDraft + delta) * 100) / 100),
    );
    setThresholdDraft(next);
    commitThreshold(next);
  }, [commitThreshold, thresholdDraft]);

  if (isLoading) return <LoadingSpinner />;

  if (isError || !preferences) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} />
        <ErrorState message={S.loadError} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const thresholdPercent = Math.round(thresholdDraft * 100);
  const hasPendingMutation = pendingField !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section title={S.sections.categorization} hint={S.categorizationHint}>
          {CATEGORIZATION_OPTIONS.map((option, index) => {
            const isSelected = preferences.categorizationMode === option.value;
            const isPending = pendingField === 'categorizationMode';
            return (
              <React.Fragment key={option.value}>
                {index > 0 ? <Divider /> : null}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.optionRow}
                  onPress={() => handleModeChange(option.value)}
                  disabled={hasPendingMutation}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityHint={option.description}
                  accessibilityState={{ selected: isSelected, disabled: hasPendingMutation, busy: isPending }}
                >
                  <View style={[styles.rowIcon, isSelected && styles.rowIconSelected]}>
                    <MaterialIcon
                      name={option.icon}
                      size={20}
                      color={isSelected ? colors.primary : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.rowDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </Section>

        {preferences.categorizationMode === 'high_confidence_auto' ? (
          <View style={styles.thresholdCard}>
            <View style={styles.thresholdHeader}>
              <View>
                <Text style={styles.thresholdLabel}>{S.threshold.label}</Text>
                <Text style={styles.thresholdValue}>{thresholdPercent}%</Text>
              </View>
              {pendingField === 'autoCategorizationThreshold' ? (
                <Text style={styles.savingText}>{S.saving}</Text>
              ) : null}
            </View>
            <Text style={styles.thresholdDescription}>
              {S.threshold.description(thresholdPercent)}
            </Text>
            <View style={styles.thresholdControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepButton}
                onPress={() => changeThresholdByStep(-THRESHOLD_STEP)}
                disabled={hasPendingMutation || thresholdDraft <= MIN_THRESHOLD}
                accessibilityRole="button"
                accessibilityLabel={S.threshold.decrease(Math.max(50, thresholdPercent - 5))}
              >
                <MaterialIcon name="remove" size={20} color={colors.onSurface} />
              </TouchableOpacity>
              <CustomSlider
                style={styles.slider}
                minimumValue={MIN_THRESHOLD}
                maximumValue={MAX_THRESHOLD}
                step={THRESHOLD_STEP}
                value={thresholdDraft}
                onValueChange={setThresholdDraft}
                onValueChangeEnd={commitThreshold}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.surfaceVariant}
                thumbTintColor={colors.primary}
                disabled={hasPendingMutation}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepButton}
                onPress={() => changeThresholdByStep(THRESHOLD_STEP)}
                disabled={hasPendingMutation || thresholdDraft >= MAX_THRESHOLD}
                accessibilityRole="button"
                accessibilityLabel={S.threshold.increase(Math.min(100, thresholdPercent + 5))}
              >
                <MaterialIcon name="add" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <Section title={S.sections.experience}>
          {EXPERIENCE_ROWS.map((row, index) => (
            <React.Fragment key={row.key}>
              {index > 0 ? <Divider /> : null}
              <PreferenceSwitchRow
                icon={row.icon}
                label={row.label}
                description={row.description}
                value={preferences[row.key]}
                isDisabled={hasPendingMutation}
                isPending={pendingField === row.key}
                onValueChange={(value) => handleSwitchChange(row.key, value)}
              />
            </React.Fragment>
          ))}
        </Section>

        <Section title={S.sections.dataScope} hint={S.dataScopeHint}>
          {DATA_SCOPE_ROWS.map((row, index) => (
            <React.Fragment key={row.key}>
              {index > 0 ? <Divider /> : null}
              <PreferenceSwitchRow
                icon={row.icon}
                label={row.label}
                value={preferences[row.key]}
                isDisabled={hasPendingMutation}
                isPending={pendingField === row.key}
                onValueChange={(value) => handleSwitchChange(row.key, value)}
              />
            </React.Fragment>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onBack}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel={S.back}
      >
        <MaterialIcon name="arrow_back" size={22} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{S.title}</Text>
      <View style={styles.headerButton} />
    </View>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Divider() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.divider} />;
}

function PreferenceSwitchRow({
  icon,
  label,
  description,
  value,
  isDisabled,
  isPending,
  onValueChange,
}: PreferenceSwitchRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View
      style={styles.switchRow}
      accessibilityState={{ busy: isPending, disabled: isDisabled }}
    >
      <View style={styles.rowIcon}>
        <MaterialIcon name={icon} size={20} color={colors.onSurfaceVariant} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={isDisabled}
        accessibilityLabel={label}
        trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.onSurfaceVariant}
        ios_backgroundColor={colors.surfaceVariant}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[3],
    },
    headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      color: colors.onSurface,
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      textAlign: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING[4],
      paddingBottom: SPACING[12],
      gap: SPACING[5],
    },
    section: { gap: SPACING[2] },
    sectionTitle: {
      paddingLeft: SPACING[2],
      color: colors.primary,
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    sectionHint: {
      paddingHorizontal: SPACING[2],
      color: colors.onSurfaceVariant,
      fontSize: FONT_SIZE.xs,
      lineHeight: 18,
    },
    card: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}50`,
      borderRadius: BORDER_RADIUS['2xl'],
      backgroundColor: colors.surfaceContainer,
    },
    optionRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[3],
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[3],
    },
    switchRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[3],
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[3],
    },
    rowIcon: {
      width: 40,
      height: 40,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.surfaceVariant,
    },
    rowIconSelected: { backgroundColor: `${colors.primary}20` },
    rowCopy: { flex: 1, gap: SPACING[1] },
    rowLabel: {
      color: colors.onSurface,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
    },
    rowLabelSelected: { color: colors.primary, fontWeight: FONT_WEIGHT.semibold },
    rowDescription: {
      color: colors.onSurfaceVariant,
      fontSize: FONT_SIZE.xs,
      lineHeight: 18,
    },
    radio: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.outline,
      borderRadius: BORDER_RADIUS.full,
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.primary,
    },
    divider: {
      height: 1,
      marginHorizontal: SPACING[4],
      backgroundColor: colors.surfaceVariant,
      opacity: 0.6,
    },
    thresholdCard: {
      gap: SPACING[3],
      padding: SPACING[4],
      borderWidth: 1,
      borderColor: `${colors.primary}50`,
      borderRadius: BORDER_RADIUS['2xl'],
      backgroundColor: colors.surfaceContainer,
    },
    thresholdHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    thresholdLabel: {
      color: colors.onSurface,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
    },
    thresholdValue: {
      color: colors.primary,
      fontSize: FONT_SIZE['2xl'],
      fontWeight: FONT_WEIGHT.bold,
    },
    thresholdDescription: {
      color: colors.onSurfaceVariant,
      fontSize: FONT_SIZE.xs,
      lineHeight: 18,
    },
    savingText: { color: colors.onSurfaceVariant, fontSize: FONT_SIZE.xs },
    thresholdControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
    stepButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.surfaceVariant,
    },
    slider: { flex: 1 },
  });
}
