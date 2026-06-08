import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

export interface NumericKeypadProps {
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onDone?: () => void;
}

export function NumericKeypad({
  onNumberPress,
  onBackspace,
  onClear,
  onDone,
}: NumericKeypadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '000', 'backspace'],
  ];

  const renderKey = (key: string) => {
    if (key === 'backspace') {
      return (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.key,
            styles.specialKey,
            pressed && styles.keyPressed,
          ]}
          onPress={onBackspace}
        >
          <MaterialIcon
            name="backspace"
            size={28}
            color={COLORS.primary}
          />
        </Pressable>
      );
    }

    if (key === 'C') {
      return (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.key,
            styles.clearKey,
            pressed && styles.keyPressed,
          ]}
          onPress={onClear}
        >
          <Text style={styles.clearKeyText}>C</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={key}
        style={({ pressed }) => [
          styles.key,
          pressed && styles.keyPressed,
        ]}
        onPress={() => onNumberPress(key)}
      >
        <Text style={styles.keyText}>{key}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Done Button Row */}
      {onDone && (
        <View style={styles.doneRow}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onDone}
            activeOpacity={0.7}
          >
            <Text style={styles.doneText}>Xong</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Numeric Keys */}
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => renderKey(key))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[6],
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING[2],
  },
  doneButton: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primaryContainer,
  },
  doneText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onPrimaryContainer,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
    gap: SPACING[3],
  },
  key: {
    flex: 1,
    aspectRatio: 2.2,
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  specialKey: {
    backgroundColor: 'transparent',
  },
  clearKey: {
    backgroundColor: COLORS.errorContainer,
  },
  clearKeyText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },
  keyText: {
    fontSize: 32,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
});
