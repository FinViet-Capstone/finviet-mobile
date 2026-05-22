import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SHADOW,
  SPACING,
} from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import type { Category } from '@/constants/categories';
import { TextInput } from '@/components/common/TextInput';
import { Button } from '@/components/common/Button';
import { DatePickerField } from '@/components/common/DatePickerField';
import { formatVND } from '@/utils/formatters';
import { useExtractFromPhoto, useCreateTransaction, useWallets } from '@/hooks';
import { PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD } from '@/constants/extraction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExtractionStatus = 'processing' | 'done' | 'failed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isoToDisplay(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

/** Returns true when the string looks like a valid image URI. */
function isValidUri(uri: string | undefined): boolean {
  return typeof uri === 'string' && uri.trim().length > 0 && uri.includes('://');
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PhotoConfirmScreen() {
  const router = useRouter();
  const { uri: rawUri, date: dateParam } = useLocalSearchParams<{
    uri?: string;
    date?: string;
  }>();
  const extract = useExtractFromPhoto();
  const createMutation = useCreateTransaction();
  const { data: walletsData } = useWallets();

  const imageUri: string | null =
    typeof rawUri === 'string' ? rawUri : null;

  const canExtract = isValidUri(imageUri ?? undefined);

  // Form / UI state
  const [status, setStatus] = useState<ExtractionStatus>(
    canExtract ? 'processing' : 'failed',
  );
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [dateIso, setDateIso] = useState<string>(dateParam ?? todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryUncertain, setCategoryUncertain] = useState<boolean>(false);
  const [amountUncertain, setAmountUncertain] = useState<boolean>(false);
  const [merchantUncertain, setMerchantUncertain] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [amountError, setAmountError] = useState<string | undefined>(undefined);

  // Run extraction when we have a valid URI
  useEffect(() => {
    if (!canExtract || !imageUri) return;
    extract.mutate(imageUri, {
      onSuccess: (result) => {
        if (result.amount !== null) setAmountRaw(String(result.amount));
        if (result.merchant !== null) setMerchant(result.merchant);
        // Prefer extraction date; fall back to forwarded calendar date if extraction returns today
        setDateIso(result.transactionDate);
        setCategoryId(result.categoryId);
        setAmountUncertain(
          result.confidence.amount < PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD,
        );
        setMerchantUncertain(
          result.confidence.merchant < PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD,
        );
        setCategoryUncertain(
          result.confidence.categoryId < PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD,
        );
        setStatus('done');
      },
      onError: () => setStatus('failed'),
    });
  // imageUri/canExtract are stable for the lifetime of this screen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCategory: Category | null = categoryId
    ? (CATEGORIES.find((c) => c.id === categoryId) ?? null)
    : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAmountChange = (text: string) => {
    setAmountRaw(text.replace(/\D/g, ''));
    if (amountError) setAmountError(undefined);
  };

  const handleCategorySelect = (id: string) => {
    setCategoryId(id);
    setCategoryUncertain(false);
    setShowCategoryModal(false);
  };

  const handleRetake = () => {
    router.back();
  };

  const handleConfirm = () => {
    const digits = amountRaw.replace(/\D/g, '');
    const amount = digits ? parseInt(digits, 10) : 0;
    if (amount <= 0) {
      setAmountError('Số tiền phải lớn hơn 0');
      return;
    }
    const wallets = walletsData?.wallets ?? [];
    const primary = wallets.find((w) => w.isPrimary) ?? wallets[0];
    if (!primary) {
      Alert.alert('Chưa có ví', 'Hãy tạo ít nhất một ví trước khi lưu giao dịch.');
      return;
    }
    createMutation.mutate(
      {
        walletId: primary.id,
        categoryId,
        amount,
        type: 'expense',
        description: merchant.trim() || null,
        merchant: merchant.trim() || null,
        transactionDate: dateIso,
        aiSuggestedCategoryId: categoryId,
        aiOverridden: false,
        entryMethod: 'photo',
        imageUrl: imageUri ?? null,
      },
      {
        onSuccess: () =>
          Alert.alert('Đã lưu!', 'Giao dịch đã được ghi lại.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () => Alert.alert('Không lưu được', 'Hãy thử lại sau.'),
      },
    );
  };

  // ── Processing state ──────────────────────────────────────────────────────

  if (status === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingBox}>
          <ActivityIndicator size="large" color={COLORS.brand[500]} />
          <Text style={styles.processingLabel}>{'Đang xử lý ảnh...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form state (done | failed) ────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>{String.fromCharCode(8249)}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{'Xác nhận giao dịch'}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image thumbnail */}
          {imageUri !== null ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : null}

          {/* Extraction failure banner */}
          {status === 'failed' ? (
            <View style={styles.failureBanner}>
              <Text style={styles.failureText}>
                {'Không đọc được ảnh. Vui lòng nhập thủ công.'}
              </Text>
            </View>
          ) : null}

          {/* Uncertain fields notice */}
          {status === 'done' && categoryUncertain ? (
            <View style={styles.uncertainNotice}>
              <Text style={styles.uncertainNoticeText}>
                {'Các trường màu cam cần kiểm tra lại trước khi xác nhận.'}
              </Text>
            </View>
          ) : null}

          {/* Amount */}
          <View style={styles.card}>
            <TextInput
              label="Số tiền"
              value={amountRaw}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              error={amountError}
              containerStyle={styles.fieldGap}
            />
            <Text style={styles.amountPreview}>{formatVND(parseInt(amountRaw, 10) || 0)}</Text>
          </View>

          {/* Merchant / Description */}
          <View style={styles.card}>
            <TextInput
              label="Nơi bán / Mô tả"
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Tên cửa hàng, mô tả..."
              returnKeyType="next"
            />
          </View>

          {/* Category */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{'Danh mục'}</Text>
            <TouchableOpacity
              style={[
                styles.selectRow,
                categoryUncertain && styles.selectRowUncertain,
              ]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.75}
            >
              {selectedCategory !== null ? (
                <View style={styles.selectRowLeft}>
                  <View style={[styles.dot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={styles.selectValue}>{selectedCategory.nameVi}</Text>
                </View>
              ) : (
                <Text style={styles.selectPlaceholder}>{'Chọn danh mục'}</Text>
              )}
              {categoryUncertain ? (
                <Text style={styles.uncertainBadge}>{'?'}</Text>
              ) : (
                <Text style={styles.chevron}>{String.fromCharCode(8250)}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Date */}
          <View style={styles.card}>
            <DatePickerField
              label="Ngày"
              value={dateIso}
              onChange={setDateIso}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <Button
              title="Chụp lại"
              variant="secondary"
              onPress={handleRetake}
              style={styles.halfBtn}
            />
            <Button
              title="Xác nhận"
              onPress={handleConfirm}
              loading={createMutation.isPending}
              style={styles.halfBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { /* absorb */ }}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{'Chọn danh mục'}</Text>
            <FlatList
              data={[...CATEGORIES]}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listRow,
                    categoryId === item.id && styles.listRowSelected,
                  ]}
                  onPress={() => handleCategorySelect(item.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dotMd, { backgroundColor: item.color }]} />
                  <Text style={styles.listRowText}>{item.nameVi}</Text>
                  {categoryId === item.id ? (
                    <Text style={styles.checkmark}>{String.fromCharCode(10003)}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  kav: {
    flex: 1,
  },

  // Processing
  processingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  processingLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    lineHeight: 32,
    color: COLORS.gray[700],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[5],
    paddingBottom: SPACING[12],
  },

  // Thumbnail
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING[4],
    backgroundColor: COLORS.gray[200],
  },

  // Failure banner
  failureBanner: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    ...SHADOW.sm,
  },
  failureText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[700],
    lineHeight: 20,
  },

  // Uncertain notice
  uncertainNotice: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.calendar.uncategorized,
    ...SHADOW.sm,
  },
  uncertainNoticeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[700],
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOW.sm,
  },
  fieldGap: {
    marginBottom: SPACING[2],
  },
  amountPreview: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  // Field label (non-TextInput fields)
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Select rows
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  selectRowUncertain: {
    borderColor: COLORS.calendar.uncategorized,
    borderWidth: 2,
  },
  selectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectValue: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[900],
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[400],
    flex: 1,
  },
  chevron: {
    fontSize: FONT_SIZE['2xl'],
    color: COLORS.gray[400],
    lineHeight: 28,
    marginLeft: SPACING[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING[2],
  },
  uncertainBadge: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.calendar.uncategorized,
    marginLeft: SPACING[2],
  },

  // Action row
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[2],
  },
  halfBtn: {
    flex: 1,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[5],
    maxHeight: '72%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[300],
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[3],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  listRowSelected: {
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
    marginVertical: SPACING[1],
  },
  dotMd: {
    width: 14,
    height: 14,
    borderRadius: BORDER_RADIUS.full,
  },
  listRowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[800],
    marginLeft: SPACING[3],
  },
  checkmark: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
});
