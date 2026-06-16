import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export type BucketId = 'needs' | 'wants' | 'savings';

export interface CategorySubItem {
  id: string;
  name: string;
  amount?: number;
}

export interface CategorySubCategory {
  id: string;
  name: string;
  items?: CategorySubItem[];
}

export interface CategoryBucket {
  id: BucketId;
  name: string;
  icon: string;
  pct: number;
  subCategories: CategorySubCategory[];
}

interface Props {
  bucket: CategoryBucket;
  onAddSubCategory?: (bucketId: BucketId) => void;
}

const BUCKET_COLORS: Record<BucketId, string> = {
  needs: COLORS.primary,
  wants: COLORS.secondary,
  savings: COLORS.tertiary,
};

const BUCKET_CONTAINER_COLORS: Record<BucketId, string> = {
  needs: COLORS.primaryContainer,
  wants: COLORS.secondaryContainer,
  savings: COLORS.tertiaryContainer,
};

function formatVND(amount: number): string {
  return `₫ ${amount.toLocaleString('vi-VN')}`;
}

export function CategoryBucketCard({ bucket, onAddSubCategory }: Props) {
  const [expanded, setExpanded] = useState(bucket.id === 'needs');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(['housing']));

  const accentColor = BUCKET_COLORS[bucket.id];
  const containerBg = BUCKET_CONTAINER_COLORS[bucket.id];

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
          <MaterialIcon name="drag_indicator" size={20} color={COLORS.onSurfaceVariant} />
          <View style={[styles.iconCircle, { backgroundColor: containerBg + '33' }]}>
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
            color={COLORS.onSurfaceVariant}
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
            return (
              <View key={sub.id} style={styles.subCategoryBlock}>
                <TouchableOpacity
                  style={styles.subRow}
                  onPress={() => toggleSub(sub.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subLeft}>
                    <MaterialIcon name="drag_indicator" size={16} color={COLORS.onSurfaceVariant + '80'} />
                    <Text style={styles.subName}>{sub.name}</Text>
                  </View>
                  {sub.items && sub.items.length > 0 && (
                    <MaterialIcon
                      name={isSubExpanded ? 'expand_less' : 'expand_more'}
                      size={16}
                      color={COLORS.onSurfaceVariant}
                    />
                  )}
                </TouchableOpacity>

                {/* Nested items */}
                {isSubExpanded && sub.items && (
                  <View style={styles.nestedContainer}>
                    <View style={[styles.nestedLine, { backgroundColor: accentColor + '80' }]} />
                    {sub.items.map((item) => (
                      <View key={item.id} style={styles.nestedRow}>
                        <View style={styles.nestedLeft}>
                          <MaterialIcon name="drag_indicator" size={14} color={COLORS.onSurfaceVariant + '4D'} />
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

          {/* Add sub-category button */}
          <TouchableOpacity
            style={styles.addSubRow}
            onPress={() => onAddSubCategory?.(bucket.id)}
            activeOpacity={0.7}
          >
            <MaterialIcon name="add_circle" size={16} color={accentColor + 'B3'} />
            <Text style={[styles.addSubText, { color: accentColor + 'B3' }]}>Add Sub-category</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '4D',
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
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
  },
  pctText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurface,
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
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  subName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
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
    color: COLORS.onSurfaceVariant,
  },
  nestedAmount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
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
