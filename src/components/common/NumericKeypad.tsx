import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

export type Operator = '+' | '-' | '×' | '÷';

export interface NumericKeypadProps {
  visible: boolean;
  onClose?: () => void;
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onDone?: () => void;
  onOperatorPress?: (op: Operator) => void;
  activeOperator?: Operator | null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Each key: (screenWidth - 2*16px padding - 4*12px gaps) / 5
// We use fixed pixel calculations via onLayout or just use a fixed aspect approach.
// Grid uses a fixed gap and percentage widths aren't reliable in RN flex-wrap,
// so we lay out rows manually for precise control.

export function NumericKeypad({
  visible,
  onClose,
  onNumberPress,
  onBackspace,
  onClear,
  onDone,
  onOperatorPress,
  activeOperator,
}: NumericKeypadProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (visible) {
      mounted.current = true;
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && !mounted.current) return null;

  const isOpActive = (op: Operator) => activeOperator === op;

  const NumKey = ({ label, wide }: { label: string; wide?: boolean }) => (
    <Pressable
      style={({ pressed }) => [styles.key, wide && styles.keyWide, pressed && styles.keyPressed]}
      onPress={() => onNumberPress(label)}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );

  const OpKey = ({ op, symbol }: { op: Operator; symbol: string }) => {
    const active = isOpActive(op);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.key,
          active ? styles.keyOpActive : styles.keyOp,
          pressed && styles.keyPressed,
        ]}
        onPress={() => onOperatorPress?.(op)}
      >
        <Text style={[styles.keyText, active ? styles.opTextActive : styles.opText]}>
          {symbol}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Tap-outside backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents={visible ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      {/* Sliding panel */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateY }] }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.blur}>
          {/*
            Layout: 5 columns, 4 rows.
            Col 5 row 3-4 is the Done key (spans 2 rows).
            We render row-by-row so the last col of rows 3-4 can share space.
          */}
          <View style={styles.grid}>
            {/* Row 1: 7 8 9 ÷ C */}
            <View style={styles.row}>
              <NumKey label="7" />
              <NumKey label="8" />
              <NumKey label="9" />
              <OpKey op="÷" symbol="÷" />
              <Pressable
                style={({ pressed }) => [styles.key, styles.clearKey, pressed && styles.keyPressed]}
                onPress={onClear}
              >
                <Text style={styles.clearText}>C</Text>
              </Pressable>
            </View>

            {/* Row 2: 4 5 6 × ⌫ */}
            <View style={styles.row}>
              <NumKey label="4" />
              <NumKey label="5" />
              <NumKey label="6" />
              <OpKey op="×" symbol="×" />
              <Pressable
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                onPress={onBackspace}
              >
                <MaterialIcon name="backspace" size={24} color={COLORS.secondary} />
              </Pressable>
            </View>

            {/* Rows 3-4: left 4 cols + Done key spanning both rows */}
            <View style={styles.rowsDouble}>
              <View style={styles.rowsDoubleLeft}>
                {/* Row 3 left */}
                <View style={styles.row}>
                  <NumKey label="1" />
                  <NumKey label="2" />
                  <NumKey label="3" />
                  <OpKey op="-" symbol="−" />
                </View>
                {/* Row 4 left */}
                <View style={styles.row}>
                  <NumKey label="0" />
                  <NumKey label="000" wide />
                  <OpKey op="+" symbol="+" />
                </View>
              </View>

              {/* Done key — spans both rows */}
              <Pressable
                style={({ pressed }) => [styles.doneKey, pressed && styles.doneKeyPressed]}
                onPress={onDone}
              >
                {activeOperator ? (
                  <Text style={styles.equalText}>=</Text>
                ) : (
                  <MaterialIcon name="check_circle" size={36} color={COLORS.onPrimary} filled />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const GAP = SPACING[3];   // 12
const H_PAD = SPACING[4]; // 16

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 41, 55, 0.45)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    flex: 4, // 4 of 5 columns
    gap: GAP,
  },
  // Standard key: flex:1 within a row of 5
  key: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(46, 53, 69, 0.6)',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(149, 142, 160, 0.2)',
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
    backgroundColor: 'rgba(46, 53, 69, 0.92)',
    transform: [{ scale: 0.95 }],
  },
  keyOp: {
    backgroundColor: 'rgba(46, 53, 69, 0.6)',
  },
  keyOpActive: {
    backgroundColor: 'rgba(160, 120, 255, 0.6)',
    borderColor: 'rgba(208, 188, 255, 0.45)',
  },
  clearKey: {
    backgroundColor: `${COLORS.errorContainer}99`,
    borderColor: `${COLORS.error}33`,
  },
  doneKey: {
    flex: 1, // 1 of 5 columns
    backgroundColor: 'rgba(160, 120, 255, 0.68)',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneKeyPressed: {
    backgroundColor: 'rgba(160, 120, 255, 0.95)',
    transform: [{ scale: 0.97 }],
  },
  keyText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
  },
  opText: {
    color: COLORS.onSurfaceVariant,
  },
  opTextActive: {
    color: COLORS.primary,
  },
  clearText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },
  equalText: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onPrimary,
  },
});
