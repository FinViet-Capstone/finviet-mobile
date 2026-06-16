import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/constants/theme';
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

const SCORE_COLOR_MAP: Record<ScoreColor, string> = {
  green: COLORS.score.green,
  amber: COLORS.score.amber,
  red: COLORS.score.red,
};

/**
 * Circular ring showing a 0–100 spending score.
 * Implemented with a plain View (border + borderRadius) per the spec —
 * Victory Native is NOT used here.
 */
export function RingBadge({ score, color, verdict, size = 120 }: RingBadgeProps) {
  const ringColor = SCORE_COLOR_MAP[color];
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

const styles = StyleSheet.create({
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
