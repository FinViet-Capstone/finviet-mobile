import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

// Non-entity UI content — static copy for entry method selection cards.
const MOCK_ENTRY_METHODS = [
  {
    id: 'manual',
    icon: '✏️',
    title: 'Nhập Tay',
    description: 'Tự nhập số tiền, mô tả và danh mục giao dịch.',
    route: '/(tabs)/entry/manual',
  },
  {
    id: 'photo',
    icon: '📷',
    title: 'Chụp Ảnh',
    description: 'Chụp ảnh hóa đơn hoặc tải ảnh lên để nhận diện tự động.',
    route: '/(tabs)/entry/photo',
  },
] as const;

export default function EntryChooserScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thêm Giao Dịch</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.prompt}>Chọn phương thức nhập</Text>

        <View style={styles.cardsContainer}>
          {MOCK_ENTRY_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => router.push(method.route)}
            >
              {/* Icon column */}
              <View style={styles.iconWrapper}>
                <Text style={styles.cardIcon}>{method.icon}</Text>
              </View>

              {/* Text column */}
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{method.title}</Text>
                <Text style={styles.cardDescription}>{method.description}</Text>
              </View>

              {/* Chevron */}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ─── Root ────────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },

  // ─── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  // ─── Body ────────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[6],
  },
  prompt: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING[4],
  },

  // ─── Cards ───────────────────────────────────────────────────────────────────
  cardsContainer: {
    gap: SPACING[4],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[5],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand[500],
    ...SHADOW.md,
  },

  // ─── Icon ────────────────────────────────────────────────────────────────────
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[4],
  },
  cardIcon: {
    fontSize: 28,
    lineHeight: 34,
  },

  // ─── Text block ──────────────────────────────────────────────────────────────
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    marginBottom: SPACING[1],
  },
  cardDescription: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.gray[500],
    lineHeight: 20,
  },

  // ─── Chevron ─────────────────────────────────────────────────────────────────
  chevron: {
    fontSize: FONT_SIZE['2xl'],
    color: COLORS.gray[300],
    marginLeft: SPACING[2],
    lineHeight: 28,
  },
});
