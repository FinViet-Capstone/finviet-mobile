import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { RawDataCardBody } from '@/components/entry/RawDataCardBody';
import { useCsvRawPreviewStore } from '@/stores/csvRawPreviewStore';

const S = {
  title: 'Dữ liệu gốc',
  hint: 'Toàn bộ giao dịch — chỉ xem, không chỉnh sửa',
  back: 'arrow_back_ios_new',
};

/**
 * Reached only from csv-review.tsx once ≥1 row in the batch has rawFields — never
 * linked to when the batch has none, so this screen never has to explain an empty
 * state to a real user. Reads its rows from csvRawPreviewStore rather than route
 * params, since csv-review already holds them in memory.
 */
export default function CsvRawPreviewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows = useCsvRawPreviewStore((s) => s.rows);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name={S.back} size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>{S.hint}</Text>
        {rows.map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.merchant} numberOfLines={1}>{row.merchant}</Text>
            <RawDataCardBody
              amount={row.amount}
              type={row.type}
              categoryLabel={row.categoryLabel}
              categoryTone={row.categoryTone}
              rawFields={row.rawFields}
            />
          </View>
        ))}
        <View style={{ height: SPACING[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING[4], height: 56,
      borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
    scroll: { flex: 1 },
    content: { paddingHorizontal: SPACING[4], paddingTop: SPACING[4], gap: SPACING[3] },
    hint: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, marginBottom: SPACING[1] },
    card: {
      gap: SPACING[2],
      padding: SPACING[3],
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    merchant: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
  });
}
