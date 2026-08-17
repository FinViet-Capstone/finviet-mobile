import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import type { SpendingScore, ScoreColor } from '@/types/ai';

export interface SpendingScoreCardProps {
  readonly score: SpendingScore | null | undefined;
  readonly onToggleView?: (view: 'weekly' | 'monthly') => void;
}

const SCORE_ARC_SIZE = 148;
const STROKE_WIDTH = 8;
const RADIUS = (SCORE_ARC_SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Always defer to the backend's own colorBadge (score.color) rather than
// re-deriving a band from the raw number — the backend's actual cutoffs
// (≥80 green, ≥50 amber, else red) don't match a naive 70/40 guess, and
// hardcoding thresholds here would drift the moment they're tuned server-side
// (scoring_criteria is admin-editable). Matches score.tsx's own mapping.
function getScoreColor(colors: ThemeColors, color: ScoreColor | undefined): string {
  if (color === 'green') return colors.tertiary;
  if (color === 'red') return colors.error;
  return colors.secondary;
}

export function SpendingScoreCard({ score, onToggleView }: SpendingScoreCardProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeView, setActiveView] = useState<'weekly' | 'monthly'>('weekly');

  const handleToggle = (view: 'weekly' | 'monthly') => {
    setActiveView(view);
    onToggleView?.(view);
  };

  const scoreValue = score?.score ?? 0;
  const ringColor = getScoreColor(colors, score?.color);
  const progress = scoreValue / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(tabs)/home/score', params: { view: activeView } })}
      activeOpacity={0.9}
    >
      <View style={styles.glowAccent} />
      <View style={styles.glowAccentBottom} />

      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <MaterialIcon name="auto_awesome" size={22} color={colors.primary} />
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
          <Svg width={SCORE_ARC_SIZE} height={SCORE_ARC_SIZE}>
            <Circle
              cx={SCORE_ARC_SIZE / 2}
              cy={SCORE_ARC_SIZE / 2}
              r={RADIUS}
              stroke={colors.surfaceContainerHighest}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={SCORE_ARC_SIZE / 2}
              cy={SCORE_ARC_SIZE / 2}
              r={RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              fill="none"
              rotation={-90}
              origin={`${SCORE_ARC_SIZE / 2}, ${SCORE_ARC_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.scoreCenter}>
            <Text style={[styles.scoreNumber, { color: colors.onSurface }]}>{scoreValue}</Text>
            <Text style={styles.scoreOutOf}>/ 100</Text>
          </View>
        </View>
      </View>

      <View style={styles.insightBox}>
        <Text style={styles.insightLabel}>AI INSIGHT</Text>
        <Text style={styles.insightText} numberOfLines={3}>
          {score?.commentaryVi ?? score?.reasonVi ?? 'Chưa có nhận xét AI cho giai đoạn này.'}
        </Text>
        <TouchableOpacity
          style={styles.insightLink}
          onPress={() => router.push({ pathname: '/(tabs)/home/score', params: { view: activeView } })}
          activeOpacity={0.7}
        >
          <Text style={styles.insightLinkText}>Xem phân tích chi tiết</Text>
          <MaterialIcon name="arrow_forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: BORDER_RADIUS['2xl'],
      padding: SPACING[5],
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.4),
      overflow: 'hidden',
      shadowColor: colors.primary,
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
      backgroundColor: withAlpha(colors.primary, 0.2),
    },
    glowAccentBottom: {
      position: 'absolute',
      bottom: -40,
      left: -40,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: withAlpha(colors.secondary, 0.1),
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
      color: colors.onSurface,
    },
    togglePill: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainerHighest,
      borderRadius: BORDER_RADIUS.full,
      padding: 3,
      borderWidth: 1,
      borderColor: withAlpha(colors.outline, 0.2),
    },
    toggleBtn: {
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1],
      borderRadius: BORDER_RADIUS.full,
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurfaceVariant,
    },
    toggleTextActive: {
      color: colors.onPrimary,
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
    scoreCenter: {
      position: 'absolute',
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
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },
    insightBox: {
      backgroundColor: withAlpha(colors.surfaceContainer, 0.8),
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING[4],
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.2),
      zIndex: 1,
    },
    insightLabel: {
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: SPACING[2],
    },
    insightText: {
      fontSize: FONT_SIZE.base,
      color: colors.onSurface,
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
      color: colors.primary,
    },
  });
}
