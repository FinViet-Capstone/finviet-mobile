import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import { TextInput } from '@/components/common/TextInput';
import { formatVND } from '@/utils/formatters';

type CompoundFreq = 'monthly' | 'yearly';

const FREQ_OPTIONS: { value: CompoundFreq; label: string }[] = [
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'yearly', label: 'Cuối kỳ' },
];

export default function InterestCalcScreen() {
  const router = useRouter();
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [freq, setFreq] = useState<CompoundFreq>('monthly');

  const result = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    const n = parseInt(months, 10) || 0;
    if (p <= 0 || r <= 0 || n <= 0) {
      return { interest: 0, total: 0, monthlyInterest: 0 };
    }
    const monthlyRate = r / 100 / 12;
    let total: number;
    if (freq === 'monthly') {
      total = p * Math.pow(1 + monthlyRate, n);
    } else {
      total = p * (1 + (r / 100) * (n / 12));
    }
    const interest = total - p;
    return {
      interest,
      total,
      monthlyInterest: interest / n,
    };
  }, [principal, rate, months, freq]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tính lãi tiết kiệm</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Inputs */}
          <View style={styles.card}>
            <TextInput
              label="Số tiền gốc (VND)"
              value={principal}
              onChangeText={(t) => setPrincipal(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="VD: 100000000"
              containerStyle={styles.field}
            />
            <TextInput
              label="Lãi suất hàng năm (%)"
              value={rate}
              onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="VD: 7.5"
              containerStyle={styles.field}
            />
            <TextInput
              label="Kỳ hạn (tháng)"
              value={months}
              onChangeText={(t) => setMonths(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="VD: 12"
              containerStyle={styles.field}
            />

            <Text style={styles.fieldLabel}>Cách tính lãi</Text>
            <View style={styles.chipRow}>
              {FREQ_OPTIONS.map((opt) => {
                const selected = freq === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      selected ? styles.chipSelected : styles.chipDefault,
                    ]}
                    onPress={() => setFreq(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected
                          ? styles.chipTextSelected
                          : styles.chipTextDefault,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Live result */}
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Tổng tiền nhận được</Text>
            <Text style={styles.resultTotal}>{formatVND(result.total)}</Text>
            <View style={styles.divider} />
            <ResultRow label="Tiền lãi" value={formatVND(result.interest)} />
            <ResultRow
              label="Lãi trung bình mỗi tháng"
              value={formatVND(result.monthlyInterest)}
            />
          </View>

          <Text style={styles.note}>
            Kết quả mang tính tham khảo. Lãi suất thực tế có thể thay đổi theo ngân hàng và chính sách.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultRowLabel}>{label}</Text>
      <Text style={styles.resultRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  kav: { flex: 1 },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  field: { marginBottom: SPACING[3] },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[600],
    marginBottom: SPACING[2],
  },

  chipRow: { flexDirection: 'row', gap: SPACING[2] },
  chip: {
    flex: 1,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  chipDefault: { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[50] },
  chipSelected: { borderColor: COLORS.brand[500], backgroundColor: COLORS.brand[50] },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  chipTextDefault: { color: COLORS.gray[600] },
  chipTextSelected: { color: COLORS.brand[600] },

  resultCard: {
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    marginBottom: SPACING[3],
    ...SHADOW.lg,
  },
  resultLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[100],
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING[1],
  },
  resultTotal: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.brand[400],
    marginVertical: SPACING[3],
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING[1],
  },
  resultRowLabel: { fontSize: FONT_SIZE.sm, color: COLORS.brand[100] },
  resultRowValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
  },

  note: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    paddingHorizontal: SPACING[2],
    textAlign: 'center',
  },
});
