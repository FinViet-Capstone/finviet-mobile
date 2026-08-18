import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { useWeeklyReport } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { AIChatbotSheet } from '@/components/home/AIChatbotSheet';

export default function WeeklyReportScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const { data: report, isLoading } = useWeeklyReport(reportId);
  const [chatOpen, setChatOpen] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon="description"
          title="Chưa có báo cáo tuần"
          subtitle="Báo cáo sẽ được tạo vào sáng thứ Hai mỗi tuần."
        />
      </SafeAreaView>
    );
  }

  const [, mm, dd] = report.weekStart.split('-');
  const weekStartDisplay = `${dd}/${mm}`;
  const weekStartDate = new Date(report.weekStart);
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekStartDate.getDate() + 6);
  const weekEndDisplay = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;

  // Split into paragraphs on \n\n
  const paragraphs = report.reportTextVi.split('\n\n');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>📰</Text>
          </View>
          <Text style={styles.heroTitle}>Báo cáo tuần</Text>
          <Text style={styles.heroSubtitle}>
            {weekStartDisplay} – {weekEndDisplay}
          </Text>
        </View>

        <View style={styles.bodyCard}>
          {paragraphs.map((p, idx) => (
            <Text
              key={idx}
              style={[styles.paragraph, idx > 0 && styles.paragraphSpacing]}
            >
              {p}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={styles.advisorCta}
          onPress={() => setChatOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.advisorIcon}>🤖</Text>
          <View style={styles.advisorTextWrap}>
            <Text style={styles.advisorTitle}>Hỏi AI Cố vấn</Text>
            <Text style={styles.advisorSub}>
              Trao đổi với AI về báo cáo này
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Báo cáo được tạo bởi AI dựa trên dữ liệu chi tiêu của bạn. Nội dung có thể chưa hoàn toàn chính xác.
        </Text>
      </ScrollView>

      <AIChatbotSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Báo cáo tuần</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[100] },
  scroll: { paddingBottom: SPACING[8] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: colors.gray[700] },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.gray[900],
  },

  heroCard: {
    margin: SPACING[5],
    padding: SPACING[6],
    alignItems: 'center',
    backgroundColor: colors.brand[500],
    borderRadius: BORDER_RADIUS['2xl'],
    ...SHADOW.lg,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.brand[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  heroIcon: { fontSize: 32 },
  heroTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: colors.white,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: colors.brand[100],
    marginTop: SPACING[1],
  },

  bodyCard: {
    marginHorizontal: SPACING[5],
    padding: SPACING[5],
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  paragraph: {
    fontSize: FONT_SIZE.base,
    color: colors.gray[800],
    lineHeight: 26,
  },
  paragraphSpacing: { marginTop: SPACING[3] },

  advisorCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[5],
    padding: SPACING[4],
    backgroundColor: colors.brand[50],
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  advisorIcon: { fontSize: 28 },
  advisorTextWrap: { flex: 1 },
  advisorTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.brand[700],
  },
  advisorSub: { fontSize: FONT_SIZE.xs, color: colors.brand[600], marginTop: 2 },
  chevron: { fontSize: FONT_SIZE.xl, color: colors.brand[600] },

  footnote: {
    paddingHorizontal: SPACING[5],
    fontSize: FONT_SIZE.xs,
    color: colors.gray[400],
    lineHeight: 18,
    textAlign: 'center',
  },
  });
}
