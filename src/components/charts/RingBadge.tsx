import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { ScoreColor } from '@/types/ai';

export interface RingBadgeProps {
  /** Score value 0–100 */
  score: number;
  color: ScoreColor;
  /** One-word Vietnamese verdict e.g. "Tốt", "Trung bình", "Kém" */
  verdict: string;
  /** Outer diameter of the ring in pixels — defaults to 120 */
  size?: number;
}

/**
 * Circular ring showing a 0–100 spending score.
 * Implemented with a plain View (border + borderRadius) per the spec —
 * Victory Native is NOT used here.
 */
export function RingBadge({ score, color, verdict, size = 120 }: RingBadgeProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scoreColorMap: Record<ScoreColor, string> = {
    green: colors.score.green,
    amber: colors.score.amber,
    red: colors.score.red,
  };
  const ringColor = scoreColorMap[color];
  const borderWidth = Math.max(6, Math.round(size * 0.067)); // ~8px at size 120
  const innerSize = size - borderWidth * 2;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor: ringColor,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
          ]}
        >
          <Text
            style={[
              styles.score,
              { color: ringColor, fontSize: Math.round(size * 0.267) },
            ]}
          >
            {score}
          </Text>
        </View>
      </View>
      <Text style={[styles.verdict, { color: ringColor }]}>{verdict}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      gap: SPACING[2],
    },
    ring: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    inner: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    score: {
      fontWeight: FONT_WEIGHT.bold,
    },
    verdict: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      textAlign: 'center',
    },
  });
}
