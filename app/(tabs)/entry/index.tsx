import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

// ─── Strings ─────────────────────────────────────────────────────────────────

const S = {
  title: 'Thêm Giao Dịch',
  subtitle: 'Chọn phương thức nhập',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EntryChooserScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const methods = useMemo(() => getMethods(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
        >
          <MaterialIcon name="close" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{S.title}</Text>
          <Text style={styles.subtitle}>{S.subtitle}</Text>
        </View>
        <View style={styles.closeBtn} />
      </View>

      {/* AI hint badge */}
      <View style={styles.aiBadge}>
        <MaterialIcon name="auto_awesome" size={14} color={colors.primary} />
        <Text style={styles.aiBadgeText}>
          Dán SMS / Scan ảnh / CSV — AI phân tích tự động
        </Text>
      </View>

      {/* Method grid */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {methods.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.75}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: m.route,
                  params: date ? { date } : undefined,
                })
              }
            >
              {/* Icon circle */}
              <View style={[styles.iconWrap, { backgroundColor: m.bgColor }]}>
                <MaterialIcon name={m.icon} size={28} color={m.color} />
              </View>

              {/* Text */}
              <Text style={styles.cardTitle}>{m.title}</Text>
              <Text style={styles.cardDesc}>{m.description}</Text>

              {/* Arrow */}
              <View style={styles.cardArrow}>
                <MaterialIcon name="arrow_forward" size={16} color={colors.outlineVariant} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Entry-method cards. Colors used to be hardcoded literals (`#d0bcff` etc. —
 * byte copies of the dark palette's primary/secondary/tertiary, plus
 * `#a0c4ff`, a blue with no token behind it at all) alongside token-based
 * `bgColor` values, so the two silently drifted apart. Both now come from the
 * same resolved `colors`.
 */
function getMethods(colors: ThemeColors) {
  return [
    {
      id: 'manual',
      icon: 'edit_note',
      title: 'Nhập Thủ Công',
      description: 'Tự nhập số tiền, danh mục và ví.',
      route: '/(tabs)/entry/manual' as const,
      color: colors.primary,
      bgColor: withAlpha(colors.primary, 0.13),
    },
    {
      id: 'sms',
      icon: 'sms',
      title: 'Dán SMS',
      description: 'Dán tin nhắn ngân hàng, AI trích xuất tự động.',
      route: '/(tabs)/entry/sms' as const,
      color: colors.secondary,
      bgColor: withAlpha(colors.secondary, 0.13),
    },
    {
      id: 'photo',
      icon: 'photo_camera',
      title: 'Scan Ảnh',
      description: 'Chụp ảnh hóa đơn, AI đọc và nhập tự động.',
      route: '/(tabs)/entry/photo' as const,
      color: colors.tertiary,
      bgColor: withAlpha(colors.tertiary, 0.13),
    },
    {
      id: 'csv',
      icon: 'upload_file',
      title: 'Nhập CSV',
      description: 'Tải file CSV từ ngân hàng để nhập hàng loạt.',
      route: '/(tabs)/entry/csv-import' as const,
      color: colors.info,
      bgColor: withAlpha(colors.info, 0.13),
    },
  ];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[4],
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDER_RADIUS.full,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onBackground,
    },
    subtitle: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },

    // AI badge
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: SPACING[1],
      backgroundColor: withAlpha(colors.primary, 0.08),
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.19),
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1] + 2,
      marginTop: SPACING[3],
      marginBottom: SPACING[1],
    },
    aiBadgeText: {
      fontSize: FONT_SIZE.xs,
      color: colors.primary,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING[4],
      paddingTop: SPACING[4],
      paddingBottom: SPACING[8],
    },

    // Grid
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING[3],
    },

    // Card
    card: {
      width: '47.5%',
      backgroundColor: colors.surfaceContainer,
      borderRadius: BORDER_RADIUS['2xl'],
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: SPACING[4],
      minHeight: 164,
      position: 'relative',
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: BORDER_RADIUS.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING[3],
    },
    cardTitle: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurface,
      marginBottom: SPACING[1],
    },
    cardDesc: {
      fontSize: FONT_SIZE.xs,
      color: colors.onSurfaceVariant,
      lineHeight: 18,
      flex: 1,
    },
    cardArrow: {
      position: 'absolute',
      bottom: SPACING[3],
      right: SPACING[3],
    },
  });
}
