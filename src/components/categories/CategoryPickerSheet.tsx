/**
 * CategoryPickerSheet — shared "Chọn danh mục" bottom sheet.
 *
 * Used by every manual-entry flow (manual add, CSV import, SMS extraction,
 * photo/receipt confirm). For expense categories it exposes a bucket filter
 * (Tất cả / Thiết yếu / Mong muốn / Tiết kiệm) so a category shows up under
 * whichever bucket the customer has actually placed it in — via
 * useCustomerCategories() — not the system's static defaultBucket.
 */

import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  withAlpha,
} from "@/theme";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { MaterialIcon } from "@/components/common/MaterialIcon";
import { DraggableSheet } from "@/components/common/DraggableSheet";
import { useCustomerCategories } from "@/hooks/useCustomerCategories";
import { getCategories, getBucketLabel } from "@/constants/categories";
import type { BucketType, CategoryType } from "@/constants/categories";

type BucketFilter = "all" | BucketType;

const BUCKET_FILTERS: BucketFilter[] = ["all", "needs", "wants", "savings"];

const S = {
  all: "Tất cả",
};

interface CategoryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  entryType: CategoryType;
  selectedCategoryId?: string | null;
  onSelect: (categoryId: string) => void;
}

export function CategoryPickerSheet({
  visible,
  onClose,
  title,
  entryType,
  selectedCategoryId,
  onSelect,
}: CategoryPickerSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: customerCats } = useCustomerCategories();
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");

  // Per-customer bucket placement, falling back to the system default for any
  // category not yet in the customer's set (e.g. not seeded/loaded yet).
  const bucketByCategoryId = useMemo(() => {
    const map = new Map<string, BucketType>();
    customerCats?.forEach((c) => map.set(c.categoryId, c.bucketId));
    return map;
  }, [customerCats]);

  const categories = useMemo(() => {
    const all = getCategories(entryType);
    if (entryType === "income" || bucketFilter === "all") return all;
    return all.filter(
      (c) => (bucketByCategoryId.get(c.id) ?? c.defaultBucket) === bucketFilter,
    );
  }, [entryType, bucketFilter, bucketByCategoryId]);

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {entryType === "expense" && (
          <View style={styles.filterRow}>
            {BUCKET_FILTERS.map((b) => (
              <TouchableOpacity
                key={b}
                activeOpacity={0.7}
                style={[
                  styles.filterChip,
                  bucketFilter === b && styles.filterChipActive,
                ]}
                onPress={() => setBucketFilter(b)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    bucketFilter === b && styles.filterChipTextActive,
                  ]}
                >
                  {b === "all" ? S.all : getBucketLabel(b)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                selectedCategoryId === item.id && styles.rowSelected,
              ]}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.rowText}>{item.nameVi}</Text>
              {selectedCategoryId === item.id && (
                <MaterialIcon name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </DraggableSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: SPACING[4],
      paddingTop: SPACING[2],
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
      marginBottom: SPACING[3],
    },
    filterRow: {
      flexDirection: "row",
      gap: SPACING[2],
      marginBottom: SPACING[3],
    },
    filterChip: {
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1],
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.surfaceContainerHighest,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.onSurfaceVariant,
    },
    filterChipTextActive: {
      color: colors.onPrimary,
    },
    // Bounded so the list scrolls inside the sheet instead of growing past the top.
    list: {
      maxHeight: 380,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: SPACING[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
      gap: SPACING[3],
    },
    rowSelected: {
      backgroundColor: withAlpha(colors.primary, 0.06),
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING[2],
      borderBottomWidth: 0,
      marginVertical: SPACING[1],
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: BORDER_RADIUS.full,
      flexShrink: 0,
    },
    rowText: {
      flex: 1,
      fontSize: FONT_SIZE.base,
      color: colors.onSurface,
    },
  });
}
