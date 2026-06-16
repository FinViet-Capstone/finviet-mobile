import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import {
  CategoryBucketCard,
  CategoryRequestSheet,
  type CategoryBucket,
  type BucketId,
  type CategoryRequestInput,
} from '@/components/categories';
import { useCustomerCategories, useMoveBucket } from '@/hooks/useCustomerCategories';
import { useCreateCategoryRequest } from '@/hooks';
import { useCustomer } from '@/hooks/useCustomer';
import { getCategoryById, getBucketLabel, getBucketIcon } from '@/constants/categories';

const BUCKET_ORDER: BucketId[] = ['needs', 'wants', 'savings'];

export default function CategoriesRoute() {
  const router = useRouter();
  const { data: cats, isLoading, isError, refetch } = useCustomerCategories();
  const { data: customer } = useCustomer();
  const [sheetVisible, setSheetVisible] = useState(false);
  const createReq = useCreateCategoryRequest();
  const moveBucket = useMoveBucket();

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
    return BUCKET_ORDER.map((b) => ({
      id: b,
      name: getBucketLabel(b),
      icon: getBucketIcon(b),
      pct: pctOf(b),
      subCategories: list
        .filter((c) => c.bucketId === b)
        .map((c) => ({
          id: c.id, // customer_category row id — needed by useMoveBucket
          name: getCategoryById(c.categoryId)?.nameVi ?? c.categoryId,
        })),
    }));
  }, [cats, pctOf]);

  const handleSubmit = useCallback(
    (input: CategoryRequestInput) => {
      createReq.mutate(
        { nameVi: input.name, type: input.type, suggestedBucket: input.suggestedBucket, notes: input.notes },
        { onSuccess: () => setSheetVisible(false) },
      );
    },
    [createReq],
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
            <CategoryBucketCard key={b.id} bucket={b} onAddSubCategory={() => setSheetVisible(true)} onMoveSubCategory={handleMove} />
          ))}
        </ScrollView>
      )}

      <CategoryRequestSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={handleSubmit}
        loading={createReq.isPending}
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
