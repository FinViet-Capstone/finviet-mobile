import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useSpendingScore } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { RingBadge } from '@/components/charts/RingBadge';

export default function SpendingScoreDetail() {
  const router = useRouter();
  const { data: score, isLoading } = useSpendingScore();

  if (isLoading) return <LoadingSpinner />;
  if (!score) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon={BarChart3}
          title="Chưa có điểm số"
          subtitle="Cần thêm dữ liệu chi tiêu để tính điểm."
        />
      </SafeAreaView>
    );
  }

  // Format weekStart "YYYY-MM-DD" → DD/MM
  const [, mm, dd] = score.weekStart.split('-');
  const weekStartDisplay = `${dd}/${mm}`;
  const weekStartDate = new Date(score.weekStart);
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekStartDate.getDate() + 6);
  const weekEndDisplay = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <RingBadge
            score={score.score}
            color={score.color}
            verdict={score.verdictVi}
            size={160}
          />
          <Text style={styles.weekRange}>
            Tuần {weekStartDisplay} – {weekEndDisplay}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đánh giá nhanh</Text>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonText}>{score.reasonVi}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phân tích chi tiết AI</Text>
          <View style={styles.commentaryCard}>
            <Text style={styles.commentaryText}>{score.commentaryVi}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cách tính điểm</Text>
          <View style={styles.scaleCard}>
            <ScaleRow color={COLORS.score.green} label="Tốt" range="≥ 70" />
            <ScaleRow color={COLORS.score.amber} label="Trung bình" range="40 – 69" />
            <ScaleRow color={COLORS.score.red} label="Cần cải thiện" range="< 40" />
            <Text style={styles.scaleNote}>
              Điểm số dựa trên 3 yếu tố: tuân thủ ngân sách, đều đặn tiết kiệm, và biến động chi tiêu bất thường.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.advisorCta}
          onPress={() => router.push('/(tabs)/report/advisor')}
          activeOpacity={0.85}
        >
          <Text style={styles.advisorIcon}>🤖</Text>
          <View style={styles.advisorTextWrap}>
            <Text style={styles.advisorTitle}>Hỏi AI Cố vấn</Text>
            <Text style={styles.advisorSub}>Tìm hiểu cách cải thiện điểm số</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Chấm Điểm Ví</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

function ScaleRow({
  color,
  label,
  range,
}: {
  color: string;
  label: string;
  range: string;
}) {
  return (
    <View style={styles.scaleRow}>
      <View style={[styles.scaleDot, { backgroundColor: color }]} />
      <Text style={styles.scaleLabel}>{label}</Text>
      <Text style={styles.scaleRange}>{range}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

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

  heroCard: {
    margin: SPACING[5],
    padding: SPACING[6],
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    alignItems: 'center',
    ...SHADOW.md,
  },
  weekRange: {
    marginTop: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    fontWeight: FONT_WEIGHT.medium,
  },

  section: { paddingHorizontal: SPACING[5], marginBottom: SPACING[4] },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[2],
  },

  reasonCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand[500],
    ...SHADOW.sm,
  },
  reasonText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[800],
    lineHeight: 24,
    fontWeight: FONT_WEIGHT.medium,
  },

  commentaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  commentaryText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[700],
    lineHeight: 22,
  },

  scaleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
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
    color: COLORS.gray[800],
    fontWeight: FONT_WEIGHT.medium,
  },
  scaleRange: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    fontWeight: FONT_WEIGHT.semibold,
  },
  scaleNote: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
  },

  advisorCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[5],
    padding: SPACING[4],
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING[3],
  },
  advisorIcon: { fontSize: 28 },
  advisorTextWrap: { flex: 1 },
  advisorTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[700],
  },
  advisorSub: { fontSize: FONT_SIZE.xs, color: COLORS.brand[600], marginTop: 2 },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.brand[600],
  },
});
