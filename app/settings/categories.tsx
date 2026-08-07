import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import {
  CategoryBucketCard,
  CustomCategorySheet,
  CategoryDragOverlay,
  zoneForAbsoluteY,
  type CategoryBucket,
  type BucketId,
  type CustomCategoryInput,
  type DragStartInfo,
} from '@/components/categories';
import { useCustomerCategories, useBulkMoveBucket } from '@/hooks/useCustomerCategories';
import {
  useEffectiveIncomeAllocation,
  useCustomCategories,
  useCreateCustomCategory,
  useBulkUpdateCustomCategoryBucket,
} from '@/hooks';
import { getCategoryById, getBucketLabel, getBucketIcon } from '@/constants/categories';
import { saveCategoryIcon } from '@/lib/categoryIconStorage';
import { getApiErrorMessage } from '@/utils/errors';

const BUCKET_ORDER: BucketId[] = ['needs', 'wants', 'savings'];

/** A drag-and-drop move staged locally until "Lưu thay đổi" persists it. */
interface PendingMove {
  subId: string;
  targetBucket: BucketId;
  isCustom: boolean;
}

export default function CategoriesRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: cats, isLoading, isError, refetch } = useCustomerCategories();
  const { data: effectiveAllocation } = useEffectiveIncomeAllocation();
  const { data: customCats } = useCustomCategories();
  const bulkMoveBucket = useBulkMoveBucket();
  const bulkUpdateCustomCategoryBucket = useBulkUpdateCustomCategoryBucket();
  const createCustomCategory = useCreateCustomCategory();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Drag-and-drop: dragX/dragY are shared values the gesture updates directly
  // (see CategoryBucketCard) so the floating chip follows the finger at 60fps
  // without a JS re-render per frame. dragInfo/dragActive are plain state —
  // they only change twice per drag (start, end), not every frame.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const [dragInfo, setDragInfo] = useState<DragStartInfo | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Moves are staged here (not persisted) so the whole bucket editor can be
  // committed with a single "Lưu thay đổi" tap instead of one API call per drag.
  const [pendingMoves, setPendingMoves] = useState<Map<string, PendingMove>>(new Map());

  const originalBucketOf = useCallback(
    (subId: string, isCustom: boolean): BucketId | null | undefined =>
      isCustom
        ? customCats?.find((c) => c.id === subId)?.bucketId
        : cats?.find((c) => c.id === subId)?.bucketId,
    [cats, customCats],
  );

  const handleDragStart = useCallback((info: DragStartInfo) => {
    setDragInfo(info);
    setDragActive(true);
  }, []);

  const handleDragEnd = useCallback(
    (absoluteY: number) => {
      const target = zoneForAbsoluteY(absoluteY);
      if (target && dragInfo) {
        setPendingMoves((prev) => {
          const next = new Map(prev);
          // Dragging an item back to its original server bucket cancels the pending move.
          if (target === originalBucketOf(dragInfo.subId, dragInfo.isCustom)) {
            next.delete(dragInfo.subId);
          } else {
            next.set(dragInfo.subId, {
              subId: dragInfo.subId,
              targetBucket: target,
              isCustom: dragInfo.isCustom,
            });
          }
          return next;
        });
      }
      setDragActive(false);
      setDragInfo(null);
    },
    [dragInfo, originalBucketOf],
  );

  /** Returns whether the save actually succeeded — callers that navigate away afterward need to know. */
  const handleSaveChanges = useCallback(async (): Promise<boolean> => {
    const moves = Array.from(pendingMoves.values());
    const systemMoves = moves.filter((m) => !m.isCustom);
    const customMoves = moves.filter((m) => m.isCustom);
    try {
      await Promise.all([
        systemMoves.length > 0
          ? bulkMoveBucket.mutateAsync(
              systemMoves.map((m) => ({
                customerCategoryId: m.subId,
                targetBucket: m.targetBucket,
              })),
            )
          : Promise.resolve(),
        customMoves.length > 0
          ? bulkUpdateCustomCategoryBucket.mutateAsync(
              customMoves.map((m) => ({ id: m.subId, bucketId: m.targetBucket })),
            )
          : Promise.resolve(),
      ]);
      setPendingMoves(new Map());
      return true;
    } catch (err) {
      Alert.alert('', getApiErrorMessage(err, 'Không thể lưu thay đổi.'));
      return false;
    }
  }, [pendingMoves, bulkMoveBucket, bulkUpdateCustomCategoryBucket]);

  const isSaving = bulkMoveBucket.isPending || bulkUpdateCustomCategoryBucket.isPending;

  // Block leaving (header back, hardware back, swipe-back) while a bucket move
  // is staged but not yet saved — otherwise it's silently discarded.
  usePreventRemove(pendingMoves.size > 0, ({ data }) => {
    Alert.alert(
      'Chưa lưu thay đổi',
      'Bạn có thay đổi danh mục chưa được lưu. Bạn muốn làm gì?',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Không lưu',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
        {
          text: 'Lưu',
          onPress: async () => {
            const saved = await handleSaveChanges();
            if (saved) navigation.dispatch(data.action);
          },
        },
      ],
    );
  });

  const pctOf = useCallback(
    (b: BucketId) => {
      if (b === 'needs') return effectiveAllocation?.needsPct ?? 50;
      if (b === 'wants') return effectiveAllocation?.wantsPct ?? 30;
      return effectiveAllocation?.savingsPct ?? 20;
    },
    [effectiveAllocation],
  );

  const buckets = useMemo<CategoryBucket[]>(() => {
    const list = cats ?? [];
    const customList = customCats ?? [];
    // Overlay any staged-but-unsaved move so the row shows in its new bucket
    // instantly, without waiting on a round trip to "Lưu thay đổi".
    const bucketFor = (id: string, fallback: BucketId | null) =>
      pendingMoves.get(id)?.targetBucket ?? fallback;
    return BUCKET_ORDER.map((b) => ({
      id: b,
      name: getBucketLabel(b),
      icon: getBucketIcon(b),
      pct: pctOf(b),
      subCategories: [
        ...list
          .filter((c) => bucketFor(c.id, c.bucketId) === b)
          .map((c) => ({
            id: c.id, // customer_category row id — needed by useBulkMoveBucket
            categoryId: c.categoryId,
            name: getCategoryById(c.categoryId)?.nameVi ?? c.categoryId,
          })),
        ...customList
          .filter((c) => bucketFor(c.id, c.bucketId) === b)
          .map((c) => ({
            id: c.id,
            categoryId: c.id,
            name: c.nameVi,
            isCustom: true,
          })),
      ],
    }));
  }, [cats, customCats, pctOf, pendingMoves]);

  const handleSubmitCustomCategory = useCallback(
    (input: CustomCategoryInput) => {
      createCustomCategory.mutate(
        { nameVi: input.name, type: 'expense', bucketId: input.bucketId, color: input.color },
        {
          onSuccess: (created) => {
            // The icon file is saved locally only after the category record
            // exists, so it's keyed by the record's real id — never uploaded.
            saveCategoryIcon(created.id, input.pickedUri, input.ext);
            setSheetVisible(false);
          },
          onError: (err) => {
            Alert.alert('', getApiErrorMessage(err, 'Không thể tạo danh mục.'));
          },
        },
      );
    },
    [createCustomCategory],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.btn}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name="arrow_back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Quản lý danh mục</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setSheetVisible(true)} style={styles.btn}>
          <MaterialIcon name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState message="Không tải được danh mục" onRetry={refetch} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            pendingMoves.size > 0 && { paddingBottom: SPACING[12] + 64 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {buckets.map((b) => (
            <CategoryBucketCard
              key={b.id}
              bucket={b}
              dragX={dragX}
              dragY={dragY}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ScrollView>
      )}

      {!dragActive && pendingMoves.size > 0 && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + SPACING[3] }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thay đổi ({pendingMoves.size})</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <CustomCategorySheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={handleSubmitCustomCategory}
        loading={createCustomCategory.isPending}
      />

      <CategoryDragOverlay
        active={dragActive}
        dragX={dragX}
        dragY={dragY}
        chipLabel={dragInfo?.name ?? null}
        chipCategoryId={dragInfo?.categoryId ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
  },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.onSurface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingTop: SPACING[4], paddingBottom: SPACING[12] },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  saveBtn: {
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onPrimary,
  },
});
