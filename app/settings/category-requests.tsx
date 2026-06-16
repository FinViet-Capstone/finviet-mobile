import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { CategoryRequestListScreen } from '@/components/settings';
import { CategoryRequestSheet, type CategoryRequestInput } from '@/components/categories';
import { useCreateCategoryRequest } from '@/hooks';

export default function CategoryRequestsRoute() {
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const createReq = useCreateCategoryRequest();

  const handleSubmit = useCallback(
    (input: CategoryRequestInput) => {
      createReq.mutate(
        {
          nameVi: input.name,
          type: input.type,
          suggestedBucket: input.suggestedBucket,
          notes: input.notes,
        },
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
        <Text style={styles.title}>Yêu cầu danh mục</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setSheetVisible(true)} style={styles.btn}>
          <MaterialIcon name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <CategoryRequestListScreen onCreateNew={() => setSheetVisible(true)} />
      </View>
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
  body: { flex: 1 },
});
