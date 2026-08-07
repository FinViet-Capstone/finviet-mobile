import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

export default function NotFoundScreen() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  link: {
    borderRadius: BORDER_RADIUS.full,
  },
  linkInner: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  linkText: {
    color: COLORS.onPrimary,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
});
