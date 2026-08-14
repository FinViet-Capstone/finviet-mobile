import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Keyboard,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

type Styles = ReturnType<typeof createStyles>;

export interface NumericKeypadProps {
  visible: boolean;
  onClose?: () => void;
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onDone?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = SPACING[3];   // 12
const H_PAD = SPACING[4]; // 16
const KEY_W = (SCREEN_WIDTH - 2 * H_PAD - 3 * GAP) / 4;

/**
 * Approx height of the solid panel. Screens add this as bottom padding so the
 * focused input/buttons sit ABOVE the numpad instead of behind it.
 */
export const NUMPAD_HEIGHT = Math.round(SPACING[5] + 4 * KEY_W + 3 * GAP + SPACING[10]);

// Each key: (screenWidth - 2*16px padding - 3*12px gaps) / 4
// We use fixed pixel calculations via onLayout or just use a fixed aspect approach.
// Grid uses a fixed gap and percentage widths aren't reliable in RN flex-wrap,
// so we lay out rows manually for precise control.

// Keys are defined at module scope (not inside NumericKeypad's render) so their
// component identity is stable — defining them inline would remount every key
// on each render, restarting press animations and hurting performance.
function NumKey({
  label,
  wide,
  onPress,
  styles,
}: {
  label: string;
  wide?: boolean;
  onPress: (num: string) => void;
  styles: Styles;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.key, wide && styles.keyWide, pressed && styles.keyPressed]}
      onPress={() => onPress(label)}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

export function NumericKeypad({
  visible,
  onClose,
  onNumberPress,
  onBackspace,
  onClear,
  onDone,
}: NumericKeypadProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    // Mutual exclusion: the custom numpad and the system keyboard must never be
    // open at once. Dismiss the system keyboard whenever the numpad opens.
    if (visible) Keyboard.dismiss();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose?.()}>
      {/* Tap-outside backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sliding panel */}
      <View style={styles.panel}>
        <View style={styles.blur}>
          {/*
            Layout: 4 columns, 4 rows.
            Col 4 row 3-4 is the Done key (spans 2 rows).
            We render row-by-row so the last col of rows 3-4 can share space.
          */}
          <View style={styles.grid}>
            {/* Row 1: 7 8 9 C */}
            <View style={styles.row}>
              <NumKey label="7" onPress={onNumberPress} styles={styles} />
              <NumKey label="8" onPress={onNumberPress} styles={styles} />
              <NumKey label="9" onPress={onNumberPress} styles={styles} />
              <Pressable
                style={({ pressed }) => [styles.key, styles.clearKey, pressed && styles.keyPressed]}
                onPress={onClear}
              >
                <Text style={styles.clearText}>C</Text>
              </Pressable>
            </View>

            {/* Row 2: 4 5 6 ⌫ */}
            <View style={styles.row}>
              <NumKey label="4" onPress={onNumberPress} styles={styles} />
              <NumKey label="5" onPress={onNumberPress} styles={styles} />
              <NumKey label="6" onPress={onNumberPress} styles={styles} />
              <Pressable
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                onPress={onBackspace}
                accessibilityLabel="Xoá số cuối"
              >
                <MaterialIcon name="backspace" size={24} color={colors.secondary} />
              </Pressable>
            </View>

            {/* Rows 3-4: left 3 cols + Done key spanning both rows */}
            <View style={styles.rowsDouble}>
              <View style={styles.rowsDoubleLeft}>
                {/* Row 3 left */}
                <View style={styles.row}>
                  <NumKey label="1" onPress={onNumberPress} styles={styles} />
                  <NumKey label="2" onPress={onNumberPress} styles={styles} />
                  <NumKey label="3" onPress={onNumberPress} styles={styles} />
                </View>
                {/* Row 4 left */}
                <View style={styles.row}>
                  <NumKey label="0" onPress={onNumberPress} styles={styles} />
                  <NumKey label="000" wide onPress={onNumberPress} styles={styles} />
                </View>
              </View>

              {/* Done key — spans both rows */}
              <Pressable
                style={({ pressed }) => [styles.doneKey, pressed && styles.doneKeyPressed]}
                onPress={onDone}
                accessibilityLabel="Xong"
              >
                <MaterialIcon name="check_circle" size={36} color={colors.onPrimary} filled />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Transparent — the keypad must NOT dim/obscure the form above it. (Tap here
    // still dismisses via onClose; it blocks touch, not the view.)
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    panel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopLeftRadius: BORDER_RADIUS['2xl'],
      borderTopRightRadius: BORDER_RADIUS['2xl'],
      overflow: 'hidden',
      backgroundColor: colors.surfaceContainerHigh, // solid (no glassmorphism)
      borderTopWidth: 1,
      borderColor: colors.outlineVariant,
    },
    blur: {
      paddingTop: SPACING[5],
      paddingHorizontal: H_PAD,
      paddingBottom: SPACING[10],
    },
    grid: {
      gap: GAP,
    },
    row: {
      flexDirection: 'row',
      gap: GAP,
    },
    // Rows 3-4 container
    rowsDouble: {
      flexDirection: 'row',
      gap: GAP,
    },
    rowsDoubleLeft: {
      flex: 3, // 3 of 4 columns
      gap: GAP,
    },
    // Standard key: flex:1 within a row of 4
    key: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: colors.surfaceContainerHighest,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 000 key spans 2 columns in a row of 4 (cols 2-3 of left section)
    keyWide: {
      flex: 2,
      aspectRatio: undefined,
      alignSelf: 'stretch',
    },
    keyPressed: {
      backgroundColor: colors.surfaceVariant,
      transform: [{ scale: 0.95 }],
    },
    clearKey: {
      backgroundColor: colors.errorContainer,
      borderColor: colors.error,
    },
    doneKey: {
      flex: 1, // 1 of 4 columns
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneKeyPressed: {
      backgroundColor: colors.primaryContainer,
      transform: [{ scale: 0.97 }],
    },
    keyText: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onSurface,
    },
    clearText: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.onErrorContainer,
    },
  });
}
