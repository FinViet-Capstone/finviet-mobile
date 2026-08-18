import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { RingBadge } from '@/components/charts/RingBadge';
import { ChatbotFAB } from '@/components/home/ChatbotFAB';
import { AIChatbotSheet } from '@/components/home/AIChatbotSheet';
import { useSpendingScore } from '@/hooks';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Chấm Điểm Ví',
  noScoreTitle: 'Chưa có điểm số',
  noScoreSubtitle: 'Cần thêm dữ liệu chi tiêu để tính điểm.',
  noDataWeek: 'Chưa có giao dịch trong tuần này. Ghi lại chi tiêu để AI chấm điểm cho bạn.',
  noDataMonth: 'Chưa có giao dịch trong tháng này. Ghi lại chi tiêu để AI chấm điểm cho bạn.',
  quickReview: 'Đánh giá nhanh',
  aiAnalysis: 'Phân tích chi tiết AI',
  aiUnavailable: 'Chưa có nhận xét AI cho giai đoạn này.',
  howScore: 'Cách tính điểm',
  scaleGood: 'Tốt',
  scaleAvg: 'Trung bình',
  scaleNeedWork: 'Cần cải thiện',
  scaleNote: 'Điểm số dựa trên 3 yếu tố: tuân thủ ngân sách, đều đặn tiết kiệm, và biến động chi tiêu bất thường.',
  spikeLabel: 'Biến động chi tiêu',
  budgetLabel: 'Tuân thủ ngân sách',
  savingsLabel: 'Tiết kiệm',
  notEnoughData: 'Chưa đủ dữ liệu',
  weightSuffix: (w: number) => `${w}% trọng số cho lần tính này`,
};

// ─── Score color helper ────────────────────────────────────────────────────────

function getScoreColor(color: 'green' | 'amber' | 'red', colors: ThemeColors): string {
  if (color === 'green') return colors.tertiary;
  if (color === 'amber') return colors.secondary;
  return colors.error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScaleRow({ color, label, range }: { color: string; label: string; range: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.scaleRow}>
      <View style={[styles.scaleDot, { backgroundColor: color }]} />
      <Text style={styles.scaleLabel}>{label}</Text>
      <Text style={styles.scaleRange}>{range}</Text>
    </View>
  );
}

function SubScoreRow({
  label,
  value,
  weight,
}: {
  label: string;
  value: number | null | undefined;
  weight: number | undefined;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasValue = value !== null && value !== undefined;
  return (
    <View style={styles.subScoreRow}>
      <View style={styles.subScoreLabelCol}>
        <Text style={styles.subScoreLabel}>{label}</Text>
        {weight !== undefined && <Text style={styles.subScoreWeight}>{S.weightSuffix(weight)}</Text>}
      </View>
      <Text style={[styles.subScoreValue, !hasValue && styles.subScoreValueMuted]}>
        {hasValue ? `${Math.round(value)}/100` : S.notEnoughData}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SpendingScoreDetail() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { view } = useLocalSearchParams<{ view?: 'weekly' | 'monthly' }>();
  const { data: score, isLoading, isRefetching, refetch } = useSpendingScore(
    view === 'monthly' ? 'monthly' : 'weekly',
  );
  const [chatOpen, setChatOpen] = useState(false);
  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return <LoadingSpinner />;

  // hasData === false: the backend found no expense transactions in the period,
  // so score/comment are neutral fillers — show the empty state, not a fake 50.
  if (!score || score.hasData === false) {
    const subtitle = !score
      ? S.noScoreSubtitle
      : score.view === 'monthly'
      ? S.noDataMonth
      : S.noDataWeek;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} />
        <EmptyState icon="bar_chart" title={S.noScoreTitle} subtitle={subtitle} />
      </SafeAreaView>
    );
  }

  const [yyyy, mm, dd] = score.weekStart.split('-');
  // Monthly scores carry the month's first day in weekStart (mirrors the
  // backend's periodStart) — label it as a month, not a fabricated 7-day
  // range starting from that date.
  const periodLabel =
    score.view === 'monthly'
      ? `Tháng ${Number(mm)}/${yyyy}`
      : (() => {
          const weekStartDate = new Date(score.weekStart);
          const weekEnd = new Date(weekStartDate);
          weekEnd.setDate(weekStartDate.getDate() + 6);
          return `Tuần ${dd}/${mm} – ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
        })();
  const accentColor = getScoreColor(score.color, colors);
  // In real mode the backend sends one `comment` field mapped onto both
  // reasonVi/commentaryVi — showing the identical paragraph twice under two
  // different headings reads as broken, so collapse to one block when they match.
  const hasDistinctCommentary =
    !!score.commentaryVi && score.commentaryVi !== score.reasonVi;
  // Real mode always sends these; only a stale cached object from before this
  // field existed would lack them entirely — fall back to the prose note then.
  const hasSubScores =
    score.spikeScore !== undefined || score.budgetScore !== undefined || score.savingsScore !== undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero ring */}
        <View style={[styles.heroCard, { borderColor: withAlpha(accentColor, 0.2) }]}>
          <RingBadge score={score.score} color={score.color} verdict={score.verdictVi} size={160} />
          <Text style={styles.weekRange}>{periodLabel}</Text>
        </View>

        {/* Quick review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.quickReview}</Text>
          <View style={[styles.reasonCard, { borderLeftColor: accentColor }]}>
            <Text style={styles.reasonText}>{score.reasonVi ?? S.aiUnavailable}</Text>
          </View>
        </View>

        {/* AI commentary — only when it says something the quick review above didn't */}
        {hasDistinctCommentary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{S.aiAnalysis}</Text>
            <View style={styles.commentaryCard}>
              <MaterialIcon name="auto_awesome" size={16} color={colors.primary} />
              <Text style={styles.commentaryText}>{score.commentaryVi}</Text>
            </View>
          </View>
        )}

        {/* Scale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.howScore}</Text>
          <View style={styles.scaleCard}>
            <ScaleRow color={colors.tertiary} label={S.scaleGood} range="≥ 80" />
            <ScaleRow color={colors.secondary} label={S.scaleAvg} range="50 – 79" />
            <ScaleRow color={colors.error} label={S.scaleNeedWork} range="< 50" />
            {hasSubScores ? (
              <View style={styles.subScoreList}>
                <SubScoreRow label={S.spikeLabel} value={score.spikeScore} weight={score.weights?.spike} />
                <SubScoreRow label={S.budgetLabel} value={score.budgetScore} weight={score.weights?.budget} />
                {score.view === 'monthly' && (
                  <SubScoreRow label={S.savingsLabel} value={score.savingsScore} weight={score.weights?.savings} />
                )}
              </View>
            ) : (
              <Text style={styles.scaleNote}>{S.scaleNote}</Text>
            )}
          </View>
        </View>

        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      <ChatbotFAB onOpen={() => setChatOpen(true)} />
      <AIChatbotSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.75}
        accessibilityRole="button" accessibilityLabel="Quay lại">
        <MaterialIcon name="arrow_back" size={24} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{S.title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[3],
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface,
  },

  heroCard: {
    margin: SPACING[4],
    padding: SPACING[6],
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS['2xl'],
    alignItems: 'center',
    borderWidth: 1,
  },
  weekRange: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.medium,
  },

  section: { paddingHorizontal: SPACING[4], marginBottom: SPACING[4] },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
    marginBottom: SPACING[2],
  },

  reasonCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  reasonText: {
    fontSize: FONT_SIZE.base,
    color: colors.onSurface,
    lineHeight: 24,
    fontWeight: FONT_WEIGHT.medium,
  },

  commentaryCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: SPACING[2],
  },
  commentaryText: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    lineHeight: 22,
  },

  scaleCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    gap: SPACING[3],
  },
  scaleDot: { width: 16, height: 16, borderRadius: 8 },
  scaleLabel: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    fontWeight: FONT_WEIGHT.medium,
  },
  scaleRange: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scaleNote: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },

  subScoreList: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: SPACING[3],
  },
  subScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subScoreLabelCol: { flex: 1, paddingRight: SPACING[3] },
  subScoreLabel: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    fontWeight: FONT_WEIGHT.medium,
  },
  subScoreWeight: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  subScoreValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  subScoreValueMuted: {
    color: colors.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.normal,
  },
  });
}
