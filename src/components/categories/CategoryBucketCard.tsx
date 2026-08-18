import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

/** How long a row must be held before the pan gesture activates as a drag (ms). */
const DRAG_ACTIVATION_DELAY_MS = 300;

function triggerDragHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export type BucketId = 'needs' | 'wants' | 'savings';

export interface CategorySubItem {
  id: string;
  name: string;
  amount?: number;
}

export interface CategorySubCategory {
  /** Row id used for the move mutation (a CustomerCategory row id, or a CustomCategory's own id). */
  id: string;
  name: string;
  /** The actual category id — resolves the icon via CategoryIcon (system or customer-created). */
  categoryId: string;
  /** false = not movable yet. Defaults to true. */
  canMove?: boolean;
  /** true = a customer-created category (needs a different move mutation than a system one). */
  isCustom?: boolean;
  items?: CategorySubItem[];
}

export interface CategoryBucket {
  id: BucketId;
  name: string;
  icon: string;
  pct: number;
  subCategories: CategorySubCategory[];
}

/** Info about the sub-category currently being dragged, reported to the parent. */
export interface DragStartInfo {
  subId: string;
  categoryId: string;
  name: string;
  fromBucket: BucketId;
  isCustom: boolean;
}

interface Props {
  bucket: CategoryBucket;
  onAddSubCategory?: (bucketId: BucketId) => void;
  /**
   * Drag-and-drop wiring (all three optional — a card renders fine without
   * them, just without draggable rows). `dragX`/`dragY` are shared values the
   * gesture updates directly so the parent's floating drag chip can follow
   * the finger without a re-render per frame. The gesture is attached to the
   * whole row and only activates after a short hold (DRAG_ACTIVATION_DELAY_MS)
   * so a plain tap still expands the row instead of starting a drag.
   */
  dragX?: SharedValue<number>;
  dragY?: SharedValue<number>;
  onDragStart?: (info: DragStartInfo) => void;
  onDragEnd?: (absoluteY: number) => void;
}

function getBucketColors(colors: ThemeColors): Record<BucketId, string> {
  return {
    needs: colors.primary,
    wants: colors.secondary,
    savings: colors.tertiary,
  };
}

function getBucketContainerColors(colors: ThemeColors): Record<BucketId, string> {
  return {
    needs: colors.primaryContainer,
    wants: colors.secondaryContainer,
    savings: colors.tertiaryContainer,
  };
}

function formatVND(amount: number): string {
  return `₫ ${amount.toLocaleString('vi-VN')}`;
}

export function CategoryBucketCard({
  bucket,
  onAddSubCategory,
  dragX,
  dragY,
  onDragStart,
  onDragEnd,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(bucket.id === 'needs');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(['housing']));

  const accentColor = useMemo(() => getBucketColors(colors)[bucket.id], [colors, bucket.id]);
  const containerBg = useMemo(() => getBucketContainerColors(colors)[bucket.id], [colors, bucket.id]);

  const toggleSub = (subId: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId);
      else next.add(subId);
      return next;
    });
  };

  return (
    <View style={styles.card}>
      {/* Bucket header */}
      <TouchableOpacity
        style={styles.bucketHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.bucketLeft}>
          <MaterialIcon name="drag_indicator" size={20} color={colors.onSurfaceVariant} />
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(containerBg, 0.2) }]}>
            <MaterialIcon name={bucket.icon} size={18} color={accentColor} />
          </View>
          <Text style={[styles.bucketName, { color: accentColor }]}>{bucket.name}</Text>
        </View>
        <View style={styles.bucketRight}>
          <View style={styles.pctBadge}>
            <Text style={styles.pctText}>{bucket.pct}%</Text>
          </View>
          <MaterialIcon
            name={expanded ? 'expand_less' : 'expand_more'}
            size={20}
            color={colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>

      {/* Threaded sub-categories */}
      {expanded && (
        <View style={styles.threadContainer}>
          {/* Vertical thread line */}
          <View style={[styles.threadLine, { backgroundColor: accentColor }]} />

          {bucket.subCategories.map((sub) => {
            const isSubExpanded = expandedSubs.has(sub.id);
            // Holding anywhere on the row (not just the small handle icon) starts the
            // drag, but only after DRAG_ACTIVATION_DELAY_MS so a quick tap still just
            // expands the row instead of picking it up.
            const dragGesture = onDragStart && onDragEnd && dragX && dragY
              ? Gesture.Pan()
                  .activateAfterLongPress(DRAG_ACTIVATION_DELAY_MS)
                  .onStart((e) => {
                    dragX.value = e.absoluteX;
                    dragY.value = e.absoluteY;
                    runOnJS(triggerDragHaptic)();
                    runOnJS(onDragStart)({
                      subId: sub.id,
                      categoryId: sub.categoryId,
                      name: sub.name,
                      fromBucket: bucket.id,
                      isCustom: !!sub.isCustom,
                    });
                  })
                  .onUpdate((e) => {
                    dragX.value = e.absoluteX;
                    dragY.value = e.absoluteY;
                  })
                  .onEnd((e) => {
                    runOnJS(onDragEnd)(e.absoluteY);
                  })
              : undefined;
            const subRowContent = (
              <View style={styles.subRow}>
                <View style={styles.dragHandle}>
                  <MaterialIcon name="drag_indicator" size={16} color={withAlpha(colors.onSurfaceVariant, 0.5)} />
                </View>
                <TouchableOpacity
                  style={styles.subLeft}
                  onPress={() => toggleSub(sub.id)}
                  activeOpacity={0.7}
                >
                  <CategoryIcon categoryId={sub.categoryId} size={16} />
                  <Text style={styles.subName}>{sub.name}</Text>
                </TouchableOpacity>
                <View style={styles.subRight}>
                  {sub.items && sub.items.length > 0 && (
                    <TouchableOpacity onPress={() => toggleSub(sub.id)} activeOpacity={0.7}>
                      <MaterialIcon
                        name={isSubExpanded ? 'expand_less' : 'expand_more'}
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
            return (
              <View key={sub.id} style={styles.subCategoryBlock}>
                {dragGesture ? (
                  <GestureDetector gesture={dragGesture}>{subRowContent}</GestureDetector>
                ) : (
                  subRowContent
                )}

                {/* Nested items */}
                {isSubExpanded && sub.items && (
                  <View style={styles.nestedContainer}>
                    <View style={[styles.nestedLine, { backgroundColor: withAlpha(accentColor, 0.5) }]} />
                    {sub.items.map((item) => (
                      <View key={item.id} style={styles.nestedRow}>
                        <View style={styles.nestedLeft}>
                          <MaterialIcon name="drag_indicator" size={14} color={withAlpha(colors.onSurfaceVariant, 0.3)} />
                          <Text style={styles.nestedName}>{item.name}</Text>
                        </View>
                        {item.amount !== undefined && (
                          <Text style={styles.nestedAmount}>{formatVND(item.amount)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add sub-category button — only rendered when a caller actually wires it up,
              so it never becomes a tappable no-op. */}
          {onAddSubCategory && (
            <TouchableOpacity
              style={styles.addSubRow}
              onPress={() => onAddSubCategory(bucket.id)}
              activeOpacity={0.7}
            >
              <MaterialIcon name="add_circle" size={16} color={withAlpha(accentColor, 0.7)} />
              <Text style={[styles.addSubText, { color: withAlpha(accentColor, 0.7) }]}>Add Sub-category</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: withAlpha(colors.outlineVariant, 0.3),
    marginBottom: SPACING[4],
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bucketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  bucketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  pctBadge: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
  },
  pctText: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurface,
  },
  threadContainer: {
    position: 'relative',
    paddingLeft: SPACING[6],
    marginTop: SPACING[2],
  },
  threadLine: {
    position: 'absolute',
    left: 0,
    top: SPACING[6],
    bottom: -SPACING[2],
    width: 2,
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.3,
  },
  subCategoryBlock: {
    marginBottom: SPACING[2],
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
  },
  dragHandle: {
    paddingVertical: SPACING[1],
    paddingRight: SPACING[2],
  },
  subLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  subRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  subName: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
  },
  nestedContainer: {
    position: 'relative',
    paddingLeft: SPACING[6],
    marginTop: SPACING[1],
  },
  nestedLine: {
    position: 'absolute',
    left: 0,
    top: SPACING[6],
    bottom: -SPACING[2],
    width: 2,
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.3,
  },
  nestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
  },
  nestedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  nestedName: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
  },
  nestedAmount: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
  },
  addSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingLeft: SPACING[10],
  },
  addSubText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  });
}
