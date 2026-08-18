import { useMemo } from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

export default function NotFoundScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy trang' }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Không tìm thấy trang này</Text>
        <Link href="/" style={styles.link}>
          <View style={styles.linkInner}>
            <Text style={styles.linkText}>Về trang chủ</Text>
          </View>
        </Link>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING[4],
      backgroundColor: colors.background,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.onSurface,
    },
    link: {
      borderRadius: BORDER_RADIUS.full,
    },
    linkInner: {
      paddingHorizontal: SPACING[5],
      paddingVertical: SPACING[3],
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.full,
    },
    linkText: {
      color: colors.onPrimary,
      fontWeight: FONT_WEIGHT.semibold,
      fontSize: FONT_SIZE.sm,
    },
  });
}
