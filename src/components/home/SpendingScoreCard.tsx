import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import type { SpendingScore } from '@/types/ai';

export interface SpendingScoreCardProps {
  readonly score: SpendingScore | null | undefined;
  readonly onToggleView?: (view: 'weekly' | 'monthly') => void;
}

const SCORE_ARC_SIZE = 148;
const STROKE_WIDTH = 8;
const RADIUS = (SCORE_ARC_SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number): string {
  if (score >= 70) return COLORS.tertiary;
  if (score >= 40) return COLORS.secondary;
  return COLORS.error;
}

export function SpendingScoreCard({ score, onToggleView }: SpendingScoreCardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'weekly' | 'monthly'>('weekly');

  const handleToggle = (view: 'weekly' | 'monthly') => {
    setActiveView(view);
    onToggleView?.(view);
  };

  const scoreValue = score?.score ?? 0;
  const ringColor = getScoreColor(scoreValue);
  const progress = scoreValue / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/(tabs)/home/score')}
      activeOpacity={0.9}
    >
      <View style={styles.glowAccent} />
      <View style={styles.glowAccentBottom} />

      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <MaterialIcon name="auto_awesome" size={22} color={COLORS.primary} />
          <Text style={styles.title}>Điểm chi tiêu</Text>
        </View>
        <View style={styles.togglePill}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'weekly' && styles.toggleBtnActive]}
            onPress={() => handleToggle('weekly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeView === 'weekly' && styles.toggleTextActive]}>
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'monthly' && styles.toggleBtnActive]}
            onPress={() => handleToggle('monthly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeView === 'monthly' && styles.toggleTextActive]}>
              Tháng
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scoreRingWrapper}>
        <View style={[styles.scoreRingOuter, { width: SCORE_ARC_SIZE, height: SCORE_ARC_SIZE }]}>
          <View style={styles.scoreRingTrack} />
          <View
            style={[
              styles.scoreRingFill,
              {
                borderColor: ringColor,
                shadowColor: ringColor,
              },
            ]}
          />
          <View style={styles.scoreCenter}>
            <Text style={[styles.scoreNumber, { color: COLORS.onSurface }]}>{scoreValue}</Text>
            <Text style={styles.scoreOutOf}>/ 100</Text>
          </View>
        </View>
      </View>

      <View style={styles.insightBox}>
        <Text style={styles.insightLabel}>AI INSIGHT</Text>
        <Text style={styles.insightText} numberOfLines={3}>
          {score?.commentaryVi ?? score?.reasonVi ?? 'Đang phân tích dữ liệu chi tiêu của bạn...'}
        </Text>
        <TouchableOpacity
          style={styles.insightLink}
          onPress={() => router.push('/(tabs)/home/score')}
          activeOpacity={0.7}
        >
          <Text style={styles.insightLinkText}>Xem phân tích chi tiết</Text>
          <MaterialIcon name="arrow_forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: `${COLORS.primary}66`,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  glowAccent: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${COLORS.primary}33`,
  },
  glowAccentBottom: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.secondary}1A`,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
    zIndex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: BORDER_RADIUS.full,
    padding: 3,
    borderWidth: 1,
    borderColor: `${COLORS.outline}33`,
  },
  toggleBtn: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
  },
  toggleTextActive: {
    color: COLORS.onPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  scoreRingWrapper: {
    alignItems: 'center',
    marginBottom: SPACING[5],
    zIndex: 1,
  },
  scoreRingOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scoreRingTrack: {
    position: 'absolute',
    width: SCORE_ARC_SIZE - STROKE_WIDTH,
    height: SCORE_ARC_SIZE - STROKE_WIDTH,
    borderRadius: (SCORE_ARC_SIZE - STROKE_WIDTH) / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: COLORS.surfaceContainerHighest,
  },
  scoreRingFill: {
    position: 'absolute',
    width: SCORE_ARC_SIZE - STROKE_WIDTH,
    height: SCORE_ARC_SIZE - STROKE_WIDTH,
    borderRadius: (SCORE_ARC_SIZE - STROKE_WIDTH) / 2,
    borderWidth: STROKE_WIDTH,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 44,
    letterSpacing: -1,
  },
  scoreOutOf: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  insightBox: {
    backgroundColor: `${COLORS.surfaceContainer}CC`,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
    zIndex: 1,
  },
  insightLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: SPACING[2],
  },
  insightText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    lineHeight: 22,
    marginBottom: SPACING[3],
  },
  insightLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  insightLinkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
});
