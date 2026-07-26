import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import {
  CategoryBucketCard,
  CustomCategorySheet,
  type CategoryBucket,
  type BucketId,
  type CustomCategoryInput,
} from '@/components/categories';
import { useCustomerCategories, useMoveBucket } from '@/hooks/useCustomerCategories';
import { useCustomCategories, useCreateCustomCategory } from '@/hooks';
import { useCustomer } from '@/hooks/useCustomer';
import { getCategoryById, getBucketLabel, getBucketIcon } from '@/constants/categories';
import { saveCategoryIcon } from '@/lib/categoryIconStorage';
import { getApiErrorMessage } from '@/utils/errors';

const BUCKET_ORDER: BucketId[] = ['needs', 'wants', 'savings'];

export default function CategoriesRoute() {
  const router = useRouter();
  const { data: cats, isLoading, isError, refetch } = useCustomerCategories();
  const { data: customCats } = useCustomCategories();
  const { data: customer } = useCustomer();
  const moveBucket = useMoveBucket();
  const createCustomCategory = useCreateCustomCategory();
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleMove = useCallback(
    (customerCategoryId: string, fromBucket: BucketId) => {
      // Savings is locked; only Needs↔Wants are legal — toggle to the other jar.
      moveBucket.mutate({ customerCategoryId, targetBucket: fromBucket === 'needs' ? 'wants' : 'needs' });
    },
    [moveBucket],
  );

  const pctOf = useCallback(
    (b: BucketId) => {
      if (b === 'needs') return customer?.needsPct ?? 50;
      if (b === 'wants') return customer?.wantsPct ?? 30;
      return customer?.savingsPct ?? 20;
    },
    [customer],
  );

  const buckets = useMemo<CategoryBucket[]>(() => {
    const list = cats ?? [];
    const customList = customCats ?? [];
    return BUCKET_ORDER.map((b) => ({
      id: b,
      name: getBucketLabel(b),
      icon: getBucketIcon(b),
      pct: pctOf(b),
      subCategories: [
        ...list
          .filter((c) => c.bucketId === b)
          .map((c) => ({
            id: c.id, // customer_category row id — needed by useMoveBucket
            categoryId: c.categoryId,
            name: getCategoryById(c.categoryId)?.nameVi ?? c.categoryId,
          })),
        ...customList
          .filter((c) => c.bucketId === b)
          .map((c) => ({
            id: c.id,
            categoryId: c.id,
            name: c.nameVi,
            // Bucket reassignment for customer-created categories lands with
            // drag-and-drop (item 5) — not movable via the swap button yet.
            canMove: false,
          })),
      ],
    }));
  }, [cats, customCats, pctOf]);

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
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.btn}>
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
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {buckets.map((b) => (
            <CategoryBucketCard key={b.id} bucket={b} onMoveSubCategory={handleMove} />
          ))}
        </ScrollView>
      )}

      <CustomCategorySheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={handleSubmitCustomCategory}
        loading={createCustomCategory.isPending}
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
});
