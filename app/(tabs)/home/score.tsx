import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
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
  quickReview: 'Đánh giá nhanh',
  aiAnalysis: 'Phân tích chi tiết AI',
  howScore: 'Cách tính điểm',
  scaleGood: 'Tốt',
  scaleAvg: 'Trung bình',
  scaleNeedWork: 'Cần cải thiện',
  scaleNote: 'Điểm số dựa trên 3 yếu tố: tuân thủ ngân sách, đều đặn tiết kiệm, và biến động chi tiêu bất thường.',
};

// ─── Score color helper ────────────────────────────────────────────────────────

function getScoreColor(color: 'green' | 'amber' | 'red'): string {
  if (color === 'green') return COLORS.tertiary;
  if (color === 'amber') return COLORS.secondary;
  return COLORS.error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScaleRow({ color, label, range }: { color: string; label: string; range: string }) {
  return (
    <View style={styles.scaleRow}>
      <View style={[styles.scaleDot, { backgroundColor: color }]} />
      <Text style={styles.scaleLabel}>{label}</Text>
      <Text style={styles.scaleRange}>{range}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SpendingScoreDetail() {
  const router = useRouter();
  const { data: score, isLoading } = useSpendingScore('weekly');
  const [chatOpen, setChatOpen] = useState(false);

  if (isLoading) return <LoadingSpinner />;

  if (!score) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} />
        <EmptyState icon="bar_chart" title={S.noScoreTitle} subtitle={S.noScoreSubtitle} />
      </SafeAreaView>
    );
  }

  const [, mm, dd] = score.weekStart.split('-');
  const weekStartDisplay = `${dd}/${mm}`;
  const weekStartDate = new Date(score.weekStart);
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekStartDate.getDate() + 6);
  const weekEndDisplay = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
  const accentColor = getScoreColor(score.color);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero ring */}
        <View style={[styles.heroCard, { borderColor: `${accentColor}33` }]}>
          <RingBadge score={score.score} color={score.color} verdict={score.verdictVi} size={160} />
          <Text style={styles.weekRange}>
            Tuần {weekStartDisplay} – {weekEndDisplay}
          </Text>
        </View>

        {/* Quick review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.quickReview}</Text>
          <View style={[styles.reasonCard, { borderLeftColor: accentColor }]}>
            <Text style={styles.reasonText}>{score.reasonVi}</Text>
          </View>
        </View>

        {/* AI commentary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.aiAnalysis}</Text>
          <View style={styles.commentaryCard}>
            <MaterialIcon name="auto_awesome" size={16} color={COLORS.primary} />
            <Text style={styles.commentaryText}>{score.commentaryVi}</Text>
          </View>
        </View>

        {/* Scale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.howScore}</Text>
          <View style={styles.scaleCard}>
            <ScaleRow color={COLORS.tertiary} label={S.scaleGood} range="≥ 70" />
            <ScaleRow color={COLORS.secondary} label={S.scaleAvg} range="40 – 69" />
            <ScaleRow color={COLORS.error} label={S.scaleNeedWork} range="< 40" />
            <Text style={styles.scaleNote}>{S.scaleNote}</Text>
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
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.75}>
        <MaterialIcon name="arrow_back" size={24} color={COLORS.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{S.title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface,
  },

  heroCard: {
    margin: SPACING[4],
    padding: SPACING[6],
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS['2xl'],
    alignItems: 'center',
    borderWidth: 1,
  },
  weekRange: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.medium,
  },

  section: { paddingHorizontal: SPACING[4], marginBottom: SPACING[4] },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[2],
  },

  reasonCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  reasonText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    lineHeight: 24,
    fontWeight: FONT_WEIGHT.medium,
  },

  commentaryCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING[2],
  },
  commentaryText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
    lineHeight: 22,
  },

  scaleCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
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
    color: COLORS.onSurface,
    fontWeight: FONT_WEIGHT.medium,
  },
  scaleRange: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scaleNote: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
});
