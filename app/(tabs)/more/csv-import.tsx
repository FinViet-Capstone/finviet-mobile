import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
import { Button } from '@/components/common/Button';

type BankId = 'vietinbank' | 'bidv' | 'vietcombank';

interface BankOption {
  id: BankId;
  shortName: string;
  fullName: string;
  icon: string;
  format: string;
}

const BANKS: BankOption[] = [
  {
    id: 'vietinbank',
    shortName: 'VietinBank',
    fullName: 'Ngân hàng TMCP Công thương Việt Nam',
    icon: '🏦',
    format: 'Định dạng XLSX/CSV xuất từ iPay',
  },
  {
    id: 'bidv',
    shortName: 'BIDV',
    fullName: 'Ngân hàng Đầu tư & Phát triển Việt Nam',
    icon: '🏛️',
    format: 'Định dạng CSV xuất từ Smart Banking',
  },
  {
    id: 'vietcombank',
    shortName: 'Vietcombank',
    fullName: 'Ngân hàng Ngoại thương Việt Nam',
    icon: '🏦',
    format: 'Định dạng CSV xuất từ VCB Digibank',
  },
];

export default function CSVImportScreen() {
  const router = useRouter();
  const [selectedBank, setSelectedBank] = useState<BankId | null>(null);
  const [picking, setPicking] = useState(false);

  const handleSelectFile = () => {
    if (!selectedBank) {
      Alert.alert('Chọn ngân hàng', 'Vui lòng chọn ngân hàng trước khi tải lên.');
      return;
    }
    setPicking(true);
    // Mock file picker — real implementation will use expo-document-picker
    setTimeout(() => {
      setPicking(false);
      router.push(
        `/(tabs)/more/csv-preview?bank=${selectedBank}&fileName=transactions_${selectedBank}.csv` as never,
      );
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhập CSV ngân hàng</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Tải dữ liệu giao dịch hàng loạt</Text>
          <Text style={styles.introBody}>
            Chọn ngân hàng của bạn, sau đó tải lên file CSV/XLSX đã xuất từ ứng dụng ngân hàng. Hệ thống sẽ tự động phân loại danh mục bằng AI.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Chọn ngân hàng</Text>

        {BANKS.map((bank) => {
          const selected = selectedBank === bank.id;
          return (
            <TouchableOpacity
              key={bank.id}
              style={[
                styles.bankCard,
                selected ? styles.bankCardSelected : styles.bankCardDefault,
              ]}
              onPress={() => setSelectedBank(bank.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.bankIcon}>{bank.icon}</Text>
              <View style={styles.bankText}>
                <Text style={styles.bankName}>{bank.shortName}</Text>
                <Text style={styles.bankFull}>{bank.fullName}</Text>
                <Text style={styles.bankFormat}>{bank.format}</Text>
              </View>
              {selected ? (
                <View style={styles.bankCheck}>
                  <Text style={styles.bankCheckText}>✓</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {/* Upload section */}
        <View style={styles.uploadCard}>
          <Text style={styles.uploadIcon}>📄</Text>
          <Text style={styles.uploadTitle}>Tải lên file CSV</Text>
          <Text style={styles.uploadHint}>
            Hỗ trợ .csv và .xlsx, dung lượng tối đa 5MB
          </Text>
          <Button
            title="Chọn file"
            onPress={handleSelectFile}
            loading={picking}
            disabled={!selectedBank}
            style={styles.uploadBtn}
          />
        </View>

        <Text style={styles.privacyNote}>
          🔒 File sẽ được xử lý cục bộ trên thiết bị, sau đó dữ liệu được mã hóa khi gửi đến máy chủ. Chúng tôi không lưu file gốc.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
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

  intro: { marginBottom: SPACING[4] },
  introTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[2],
  },
  introBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    lineHeight: 22,
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },

  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    marginBottom: SPACING[3],
    gap: SPACING[3],
    ...SHADOW.sm,
  },
  bankCardDefault: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray[200],
  },
  bankCardSelected: {
    backgroundColor: COLORS.brand[50],
    borderColor: COLORS.brand[500],
  },
  bankIcon: { fontSize: 32 },
  bankText: { flex: 1 },
  bankName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  bankFull: { fontSize: FONT_SIZE.xs, color: COLORS.gray[600], marginTop: 2 },
  bankFormat: { fontSize: 11, color: COLORS.gray[400], marginTop: 4 },
  bankCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankCheckText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold },

  uploadCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.brand[200],
    borderStyle: 'dashed',
    padding: SPACING[6],
    alignItems: 'center',
    marginTop: SPACING[3],
    marginBottom: SPACING[4],
  },
  uploadIcon: { fontSize: 48, marginBottom: SPACING[2] },
  uploadTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[1],
  },
  uploadHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    marginBottom: SPACING[4],
    textAlign: 'center',
  },
  uploadBtn: { alignSelf: 'stretch' },

  privacyNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    paddingHorizontal: SPACING[2],
  },
});
