import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput as RNTextInput,
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
import { Button } from '@/components/common/Button';
import { formatVND } from '@/utils/formatters';

interface Person {
  id: string;
  name: string;
  share: string; // raw digits or '' for equal share
}

const MAX_PEOPLE = 10;
const MIN_PEOPLE = 2;

export default function SplitCalcScreen() {
  const router = useRouter();
  const [totalRaw, setTotalRaw] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [people, setPeople] = useState<Person[]>([
    { id: 'p1', name: 'Người 1', share: '' },
    { id: 'p2', name: 'Người 2', share: '' },
    { id: 'p3', name: 'Người 3', share: '' },
  ]);

  const total = parseInt(totalRaw, 10) || 0;
  const peopleCount = people.length;

  const equalShare = peopleCount > 0 ? total / peopleCount : 0;

  const customShares = useMemo(() => {
    if (!customMode) return null;
    const sum = people.reduce(
      (s, p) => s + (parseInt(p.share, 10) || 0),
      0,
    );
    return { sum, balanced: sum === total };
  }, [customMode, people, total]);

  const handleAddPerson = () => {
    if (people.length >= MAX_PEOPLE) return;
    setPeople((prev) => [
      ...prev,
      { id: `p${Date.now()}`, name: `Người ${prev.length + 1}`, share: '' },
    ]);
  };

  const handleRemovePerson = (id: string) => {
    if (people.length <= MIN_PEOPLE) return;
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePerson = (id: string, patch: Partial<Person>) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleSplitEqually = () => {
    if (peopleCount === 0 || total === 0) return;
    const each = Math.round(total / peopleCount);
    setPeople((prev) => prev.map((p) => ({ ...p, share: String(each) })));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chia hóa đơn</Text>
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
          {/* Total */}
          <View style={styles.card}>
            <TextInput
              label="Tổng hóa đơn (VND)"
              value={totalRaw}
              onChangeText={(t) => setTotalRaw(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              containerStyle={styles.field}
            />
            <Text style={styles.totalPreview}>{formatVND(total)}</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeChip,
                !customMode ? styles.modeChipSelected : styles.modeChipDefault,
              ]}
              onPress={() => setCustomMode(false)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.modeChipText,
                  !customMode
                    ? styles.modeChipTextSelected
                    : styles.modeChipTextDefault,
                ]}
              >
                Chia đều
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeChip,
                customMode ? styles.modeChipSelected : styles.modeChipDefault,
              ]}
              onPress={() => setCustomMode(true)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.modeChipText,
                  customMode
                    ? styles.modeChipTextSelected
                    : styles.modeChipTextDefault,
                ]}
              >
                Tùy chỉnh
              </Text>
            </TouchableOpacity>
          </View>

          {!customMode ? (
            <View style={styles.equalCard}>
              <Text style={styles.equalLabel}>Mỗi người</Text>
              <Text style={styles.equalAmount}>{formatVND(equalShare)}</Text>
              <Text style={styles.equalSub}>
                Chia cho {peopleCount} người
              </Text>
            </View>
          ) : null}

          {/* People list */}
          <View style={styles.peopleSection}>
            <View style={styles.peopleHeader}>
              <Text style={styles.peopleTitle}>
                Người ({peopleCount})
              </Text>
              {customMode ? (
                <TouchableOpacity onPress={handleSplitEqually}>
                  <Text style={styles.linkAction}>Chia đều</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {people.map((p, idx) => (
              <View key={p.id} style={styles.personRow}>
                <View style={styles.personRank}>
                  <Text style={styles.personRankText}>{idx + 1}</Text>
                </View>
                <RNTextInput
                  value={p.name}
                  onChangeText={(t) => updatePerson(p.id, { name: t })}
                  placeholder={`Người ${idx + 1}`}
                  style={styles.personName}
                />
                {customMode ? (
                  <RNTextInput
                    value={p.share}
                    onChangeText={(t) =>
                      updatePerson(p.id, { share: t.replace(/\D/g, '') })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    style={styles.personShare}
                  />
                ) : (
                  <Text style={styles.personEqualText}>
                    {formatVND(equalShare)}
                  </Text>
                )}
                {people.length > MIN_PEOPLE ? (
                  <TouchableOpacity
                    onPress={() => handleRemovePerson(p.id)}
                    style={styles.removeBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            {people.length < MAX_PEOPLE ? (
              <Button
                title="+ Thêm người"
                variant="secondary"
                onPress={handleAddPerson}
                style={styles.addBtn}
              />
            ) : null}

            {customMode && customShares ? (
              <View
                style={[
                  styles.balanceBanner,
                  customShares.balanced
                    ? styles.balanceOk
                    : styles.balanceWarn,
                ]}
              >
                <Text style={styles.balanceText}>
                  Tổng đã chia: {formatVND(customShares.sum)}
                  {customShares.balanced
                    ? ' ✓ Khớp với hóa đơn'
                    : ` (chênh ${formatVND(Math.abs(total - customShares.sum))})`}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  field: { marginBottom: SPACING[2] },
  totalPreview: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  modeRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  modeChip: {
    flex: 1,
    paddingVertical: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modeChipDefault: { borderColor: COLORS.gray[200], backgroundColor: COLORS.white },
  modeChipSelected: { borderColor: COLORS.brand[500], backgroundColor: COLORS.brand[50] },
  modeChipText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  modeChipTextDefault: { color: COLORS.gray[600] },
  modeChipTextSelected: { color: COLORS.brand[600] },

  equalCard: {
    backgroundColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    alignItems: 'center',
    marginBottom: SPACING[4],
    ...SHADOW.md,
  },
  equalLabel: { fontSize: FONT_SIZE.sm, color: COLORS.brand[100] },
  equalAmount: {
    marginVertical: SPACING[1],
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  equalSub: { fontSize: FONT_SIZE.xs, color: COLORS.brand[100] },

  peopleSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    ...SHADOW.sm,
  },
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  peopleTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkAction: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.semibold,
  },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING[2],
  },
  personRank: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  personRankText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand[600],
    fontWeight: FONT_WEIGHT.bold,
  },
  personName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[800],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
  },
  personShare: {
    width: 110,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[800],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.md,
    textAlign: 'right',
    fontWeight: FONT_WEIGHT.semibold,
  },
  personEqualText: {
    width: 110,
    textAlign: 'right',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.brand[600],
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { fontSize: FONT_SIZE.sm, color: COLORS.gray[400] },

  addBtn: { marginTop: SPACING[3] },

  balanceBanner: {
    marginTop: SPACING[3],
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.md,
  },
  balanceOk: { backgroundColor: '#DCFCE7' },
  balanceWarn: { backgroundColor: '#FEF3C7' },
  balanceText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[700],
    fontWeight: FONT_WEIGHT.medium,
  },
});
