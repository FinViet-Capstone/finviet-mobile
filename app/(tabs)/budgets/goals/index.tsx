import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function GoalsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.text}>Mục tiêu tiết kiệm — Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.onSurfaceVariant },
});
