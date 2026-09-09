import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { formatVND } from '@/utils/formatters';

const FULL_CIRCLE = 360;
/** Angular breathing room between sectors so the three buckets read as separate. */
const GAP_DEGREES = 2;
const MARKER_RADIUS = 10;

export interface PieBucket {
  readonly key: string;
  readonly label: string;
  readonly spent: number;
  readonly limit: number;
  readonly color: string;
  /** Savings: reaching/exceeding the target is good, so it must never read as an overspend. */
  readonly goalMode?: boolean;
}

export interface PieSegment {
  readonly bucket: PieBucket;
  readonly startAngle: number;
  readonly endAngle: number;
  /** How much of this bucket's OWN limit is used, 0–1 — capped, see the note below. */
  readonly fillRatio: number;
  readonly isOver: boolean;
  readonly overAmount: number;
}

/**
 * Lays the buckets out around one ring: a sector's ANGLE is that bucket's share
 * of the total allocation, so the three sectors really are parts of one whole
 * (the month's income — `needsLimit + wantsLimit + savingsLimit` is exactly
 * `income` by construction on the Home screen). The filled part inside a sector
 * is how much of that bucket's own limit is spent.
 *
 * An overspent bucket fills its own sector and **stops at its boundary** rather
 * than bleeding into its neighbours — a sector that grew past its share would
 * make the ring lie about the other two buckets, and a pie has no geometry for
 * ">100% of a slice" anyway. The magnitude is not lost, it moves to `overAmount`
 * and is surfaced by the long-press popup instead.
 */
export function computePieSegments(buckets: readonly PieBucket[]): PieSegment[] {
  const total = buckets.reduce((sum, b) => sum + Math.max(0, b.limit), 0);
  if (total <= 0) return [];

  // Force the LAST bucket that actually has a limit to close the ring, so float
  // drift can never leave a hairline gap — and so a trailing zero-limit bucket
  // never inherits a full sector.
  const lastVisible = buckets.reduce((last, b, i) => (b.limit > 0 ? i : last), -1);

  const segments: PieSegment[] = [];
  let cursor = 0;
  buckets.forEach((bucket, i) => {
    const limit = Math.max(0, bucket.limit);
    const spent = Math.max(0, bucket.spent);
    const endAngle = i === lastVisible ? FULL_CIRCLE : cursor + (limit / total) * FULL_CIRCLE;
    segments.push({
      bucket,
      startAngle: cursor,
      endAngle,
      fillRatio: limit > 0 ? Math.min(1, spent / limit) : 0,
      isOver: limit > 0 && spent > limit,
      overAmount: limit > 0 ? Math.max(0, spent - limit) : 0,
    });
    cursor = endAngle;
  });
  return segments;
}

/** Bucket colour normally; danger once overspent — except Savings, where over is good. */
export function segmentFillColor(segment: PieSegment, colors: ThemeColors): string {
  if (!segment.isOver) return segment.bucket.color;
  return segment.bucket.goalMode ? colors.budget.safe : colors.budget.danger;
}

export interface BudgetAllocationPieProps {
  readonly buckets: readonly PieBucket[];
  readonly size?: number;
  readonly ringWidth?: number;
  /** Long-press a sector to open its detail popup. */
  readonly onSegmentLongPress?: (bucketKey: string) => void;
}

export function BudgetAllocationPie({
  buckets,
  size = 184,
  ringWidth = 34,
  onSegmentLongPress,
}: BudgetAllocationPieProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const segments = useMemo(() => computePieSegments(buckets), [buckets]);

  const center = size / 2;
  const rOuter = size / 2;
  const rInner = rOuter - ringWidth;

  const totalLimit = buckets.reduce((sum, b) => sum + Math.max(0, b.limit), 0);
  const totalSpent = buckets.reduce((sum, b) => sum + Math.max(0, b.spent), 0);
  const drawn = segments.filter((s) => s.endAngle > s.startAngle);
  const gap = drawn.length > 1 ? GAP_DEGREES : 0;

  if (drawn.length === 0) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Path
            d={annulusPath(center, center, rOuter, rInner, 0, FULL_CIRCLE)}
            fill={colors.surfaceContainerHighest}
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.emptyText}>Chưa đặt{'\n'}ngân sách</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {drawn.map((segment) => {
          const drawStart = segment.startAngle + gap / 2;
          const drawEnd = segment.endAngle - gap / 2;
          if (drawEnd <= drawStart) return null;
          const fillEnd = drawStart + (drawEnd - drawStart) * segment.fillRatio;
          const fill = segmentFillColor(segment, colors);
          return (
            <G
              key={segment.bucket.key}
              onLongPress={
                onSegmentLongPress ? () => onSegmentLongPress(segment.bucket.key) : undefined
              }
            >
              {/* Full sector first: the unspent remainder still shows the bucket's share. */}
              <Path
                d={annulusPath(center, center, rOuter, rInner, drawStart, drawEnd)}
                fill={withAlpha(fill, 0.16)}
              />
              {segment.fillRatio > 0 && (
                <Path
                  d={annulusPath(center, center, rOuter, rInner, drawStart, fillEnd)}
                  fill={fill}
                />
              )}
            </G>
          );
        })}
      </Svg>

      {/* Overspend markers sit ON the offending sector, in the middle of the band. */}
      {drawn.map((segment) => {
        if (!segment.isOver || segment.bucket.goalMode) return null;
        const mid = (segment.startAngle + segment.endAngle) / 2;
        const point = polarToCartesian(center, center, rOuter - ringWidth / 2, mid);
        return (
          <View
            key={segment.bucket.key}
            pointerEvents="none"
            style={[
              styles.marker,
              {
                left: point.x - MARKER_RADIUS,
                top: point.y - MARKER_RADIUS,
                backgroundColor: colors.budget.danger,
                borderColor: colors.surfaceContainer,
              },
            ]}
          >
            <MaterialIcon name="priority_high" size={13} color={colors.onError} />
          </View>
        );
      })}

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerLabel}>Đã dùng</Text>
        <Text style={styles.centerAmount} numberOfLines={1}>{formatVND(totalSpent)}</Text>
        <Text style={styles.centerTotal} numberOfLines={1}>/ {formatVND(totalLimit)}</Text>
      </View>
    </View>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  // −90° so 0° sits at 12 o'clock and angles run clockwise, like every other
  // progress ring in this app.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Donut wedge (annulus sector) as a filled path — filled, so it hit-tests reliably. */
function annulusPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  // A true 360° arc is degenerate (start point === end point), so shave a hair off.
  const sweep = Math.min(endAngle - startAngle, FULL_CIRCLE - 0.01);
  if (sweep <= 0) return '';
  const end = startAngle + sweep;
  const largeArc = sweep > 180 ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const o2 = polarToCartesian(cx, cy, rOuter, end);
  const i2 = polarToCartesian(cx, cy, rInner, end);
  const i1 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabel: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
    },
    centerAmount: {
      fontSize: FONT_SIZE.base,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
      marginTop: 2,
    },
    centerTotal: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
    },
    emptyText: {
      fontSize: FONT_SIZE.sm,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
    },
    marker: {
      position: 'absolute',
      width: MARKER_RADIUS * 2,
      height: MARKER_RADIUS * 2,
      borderRadius: MARKER_RADIUS,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
