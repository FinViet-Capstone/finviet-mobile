import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Nhập từ file CSV',
  back: 'arrow_back_ios_new',
  uploadTitle: 'Chọn file CSV từ máy.',
  uploadSubtitle: 'Cần có cột ngày, nội dung/diễn giải và số tiền',
  uploadIcon: 'cloud_upload',
  templateBtn: 'Tải file mẫu .csv',
  templateIcon: 'download',
  aiBadge: 'Tự động gợi ý danh mục bằng AI',
  aiBadgeIcon: 'auto_awesome',
  guideTitle: 'Hướng dẫn xuất file',
  guideHelp: 'help',
  guideSteps: [
    { title: 'Đăng nhập Internet Banking', body: 'Truy cập vào website ngân hàng trực tuyến của bạn trên máy tính.' },
    { title: 'Tra cứu lịch sử giao dịch', body: 'Vào mục Tài khoản > Lịch sử giao dịch, chọn khoảng thời gian cần xuất.' },
    { title: 'Tải xuống định dạng CSV', body: 'Tìm nút "Xuất file" hoặc "Tải xuống" và chọn định dạng Excel/CSV.' },
  ],
  startBtn: 'Chọn file & phân tích',
  pickerError: 'Không thể đọc file. Vui lòng thử lại.',
  parseErrorTitle: 'Không đọc được file CSV',
  templateErrorTitle: 'Không thể tạo file mẫu',
  templateShareTitle: 'File mẫu CSV',
};

const TEMPLATE_CSV =
  'Ngày,Nội dung,Số tiền\n' +
  '2026-08-01,Cà phê Highlands,-45000\n' +
  '2026-08-05,Lương tháng 8,12000000\n';

const BOM_CHAR = String.fromCharCode(0xfeff);

// ─── Main Screen ──────────────────────────────────────────────────────────────
// This screen only picks a file and hands it off to csv-review.tsx, which runs
// the (potentially slow — one AI call per row) extraction and hosts the
// wallet-picker/preview/import step, so that work gets a dedicated loading state
// instead of appearing inline on this upload screen.

export default function CsvImportScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isPicking, setIsPicking] = useState(false);

  const handlePickFile = useCallback(async () => {
    let result: DocumentPicker.DocumentPickerResult;
    setIsPicking(true);
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });
    } catch {
      setIsPicking(false);
      Alert.alert(S.parseErrorTitle, S.pickerError);
      return;
    }
    setIsPicking(false);
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    router.push({
      pathname: '/(tabs)/entry/csv-review' as const,
      params: { fileUri: asset.uri, fileName: asset.name ?? 'statement.csv' },
    });
  }, [router]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      const dir = new Directory(Paths.cache, 'exports');
      if (!dir.exists) dir.create({ intermediates: true });
      const file = new File(dir, 'finviet_mau_giao_dich.csv');
      if (file.exists) file.delete();
      file.create();
      file.write(BOM_CHAR + TEMPLATE_CSV);
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: S.templateShareTitle });
      } else {
        Alert.alert(S.templateShareTitle, file.uri);
      }
    } catch {
      Alert.alert(S.templateErrorTitle, S.pickerError);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name={S.back} size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Upload area */}
        <TouchableOpacity activeOpacity={0.75} style={styles.uploadArea} onPress={handlePickFile} disabled={isPicking}>
          <View style={styles.uploadIconWrap}>
            {isPicking
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <MaterialIcon name={S.uploadIcon} size={32} color={colors.primary} />}
          </View>
          <Text style={styles.uploadTitle}>{S.uploadTitle}</Text>
          <Text style={styles.uploadSubtitle}>{S.uploadSubtitle}</Text>
        </TouchableOpacity>

        {/* AI badge — AI is the categorisation engine, any CSV format works */}
        <View style={styles.aiBadge}>
          <MaterialIcon name={S.aiBadgeIcon} size={16} color={colors.primary} />
          <Text style={styles.aiBadgeText}>{S.aiBadge}</Text>
        </View>

        {/* Template link */}
        <TouchableOpacity activeOpacity={0.7} style={styles.templateBtn} onPress={handleDownloadTemplate}>
          <MaterialIcon name={S.templateIcon} size={16} color={colors.primary} />
          <Text style={styles.templateBtnText}>{S.templateBtn}</Text>
        </TouchableOpacity>

        {/* Guide */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <MaterialIcon name={S.guideHelp} size={20} color={colors.primary} />
            <Text style={styles.guideTitle}>{S.guideTitle}</Text>
          </View>
          {S.guideSteps.map((step, i) => (
            <View key={i} style={styles.guideStep}>
              <View style={styles.guideStepNum}><Text style={styles.guideStepNumText}>{i + 1}</Text></View>
              <View style={styles.guideStepText}>
                <Text style={styles.guideStepTitle}>{step.title}</Text>
                <Text style={styles.guideStepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.startBtn, isPicking && styles.confirmBtnDisabled]}
          disabled={isPicking}
          onPress={handlePickFile}
        >
          {isPicking
            ? <ActivityIndicator size="small" color={colors.onBackground} />
            : <Text style={styles.confirmText}>{S.startBtn}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING[4],
      height: 56,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.primary },

    scroll: { flex: 1 },
    content: { paddingHorizontal: SPACING[4], paddingTop: SPACING[4], gap: SPACING[4] },

    // Upload area
    uploadArea: {
      backgroundColor: withAlpha(colors.surfaceContainer, 0.6),
      borderRadius: 24,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.outlineVariant,
      paddingVertical: SPACING[6],
      alignItems: 'center',
      gap: SPACING[2],
    },
    uploadIconWrap: {
      width: 64,
      height: 64,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.primary, 0.08),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING[1],
    },
    uploadTitle: { fontSize: FONT_SIZE.sm, color: colors.onSurface, textAlign: 'center', paddingHorizontal: SPACING[4] },
    uploadSubtitle: { fontSize: 11, color: colors.outline },

    // Template
    templateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING[1],
      alignSelf: 'center',
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.primary, 0.06),
    },
    templateBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },

    // AI badge
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING[2],
      alignSelf: 'center',
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[2],
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.primary, 0.08),
    },
    aiBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: colors.primary },

    // Guide
    guideCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: BORDER_RADIUS['2xl'],
      padding: SPACING[4],
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      gap: SPACING[4],
      overflow: 'hidden',
    },
    guideHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
    guideTitle: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: colors.onSurface },
    guideStep: { flexDirection: 'row', gap: SPACING[3], alignItems: 'flex-start' },
    guideStepNum: {
      width: 28,
      height: 28,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    guideStepNumText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
    guideStepText: { flex: 1, gap: 2 },
    guideStepTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: colors.onSurface },
    guideStepBody: { fontSize: FONT_SIZE.xs, color: colors.onSurfaceVariant, lineHeight: 18 },

    // Bottom bar
    bottomBar: {
      flexDirection: 'row',
      gap: SPACING[3],
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[3],
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
      backgroundColor: colors.background,
    },
    confirmBtnDisabled: { opacity: 0.45 },
    confirmText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: colors.onBackground },
    startBtn: {
      flex: 1,
      height: 52,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.inversePrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
