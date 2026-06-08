import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput as RNTextInput,
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
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DatePickerField } from '@/components/common/DatePickerField';
import { CATEGORIES } from '@/constants/categories';
import type { Category } from '@/constants/categories';
import { useExtractFromSMS, useWallets, useCreateTransaction } from '@/hooks';
import { PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD } from '@/constants/extraction';
import { formatVND } from '@/utils/formatters';
import type { Wallet } from '@/types/wallet';

type Phase = 'paste' | 'extracting' | 'review';

const SAMPLE_SMS =
  'TK 0123456789 vua tru 125,000 VND tai GRAB FOOD luc 12:34 21/05/2026. So du: 2,225,000 VND.';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function SMSEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const initialISO = dateParam ?? todayISO();

  const extract = useExtractFromSMS();
  const createMutation = useCreateTransaction();
  const { data: walletData, isLoading: walletsLoading } = useWallets();

  // Phase state
  const [phase, setPhase] = useState<Phase>('paste');
  const [smsText, setSmsText] = useState('');

  // Form state (filled after extraction)
  const [amountRaw, setAmountRaw] = useState('');
  const [merchant, setMerchant] = useState('');
  const [dateIso, setDateIso] = useState(initialISO);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  // Per-field uncertain flags
  const [amountUncertain, setAmountUncertain] = useState(false);
  const [merchantUncertain, setMerchantUncertain] = useState(false);
  const [categoryUncertain, setCategoryUncertain] = useState(false);

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();

  useEffect(() => {
    if (walletData?.wallets && walletId === null) {
      const primary =
        walletData.wallets.find((w) => w.isPrimary) ?? walletData.wallets[0];
      setWalletId(primary?.id ?? null);
    }
  }, [walletData, walletId]);

  if (walletsLoading || !walletData) return <LoadingSpinner />;
  const wallets: Wallet[] = walletData.wallets;

  const selectedCategory: Category | null = categoryId
    ? CATEGORIES.find((c) => c.id === categoryId) ?? null
    : null;
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? wallets[0];

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleExtract = () => {
    const trimmed = smsText.trim();
    if (trimmed.length < 10) {
      Alert.alert('Tin nhắn quá ngắn', 'Vui lòng dán toàn bộ tin nhắn ngân hàng.');
      return;
    }
    setPhase('extracting');
    extract.mutate(trimmed, {
      onSuccess: (result) => {
        if (result.amount !== null) setAmountRaw(String(result.amount));
        if (result.merchant !== null) setMerchant(result.merchant);
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
        setPhase('review');
      },
      onError: () => {
        Alert.alert(
          'Không trích xuất được',
          'Không thể tự động đọc tin nhắn. Bạn có thể nhập tay.',
          [
            {
              text: 'Nhập tay',
              onPress: () =>
                router.replace({
                  pathname: '/(tabs)/entry/manual',
                  params: dateParam ? { date: dateParam } : undefined,
                }),
            },
            { text: 'Thử lại', onPress: () => setPhase('paste') },
          ],
        );
      },
    });
  };

  const handleConfirm = () => {
    const amount = parseInt(amountRaw, 10) || 0;
    if (amount <= 0) {
      setAmountError('Số tiền phải lớn hơn 0');
      return;
    }
    if (!walletId) {
      Alert.alert('Chưa chọn ví', 'Hãy chọn ví trước khi xác nhận.');
      return;
    }
    createMutation.mutate(
      {
        walletId,
        categoryId,
        amount,
        type: 'expense',
        description: merchant.trim() || null,
        merchant: merchant.trim() || null,
        transactionDate: dateIso,
        aiSuggestedCategoryId: categoryId,
        aiOverridden: false,
        entryMethod: 'manual',
      },
      {
        onSuccess: () =>
          Alert.alert('Đã lưu', 'Giao dịch đã được ghi lại.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () => Alert.alert('Không lưu được', 'Hãy thử lại sau.'),
      },
    );
  };

  const handleUseSample = () => setSmsText(SAMPLE_SMS);

  // ── Render: extracting ──────────────────────────────────────────────────────
  if (phase === 'extracting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingBox}>
          <LoadingSpinner />
          <Text style={styles.processingLabel}>Đang phân tích tin nhắn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: paste ───────────────────────────────────────────────────────────
  if (phase === 'paste') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={() => router.back()} title="Dán SMS" />

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.intro}>
              <Text style={styles.introTitle}>Dán tin nhắn ngân hàng</Text>
              <Text style={styles.introBody}>
                Sao chép tin nhắn từ ngân hàng (Vietcombank, BIDV, MoMo, ...) và dán vào ô dưới đây. AI sẽ tự động trích xuất số tiền, nơi bán, và ngày giao dịch.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Nội dung SMS</Text>
              <RNTextInput
                value={smsText}
                onChangeText={setSmsText}
                placeholder="Dán tin nhắn ngân hàng vào đây..."
                placeholderTextColor={COLORS.gray[400]}
                style={styles.smsInput}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity onPress={handleUseSample} style={styles.sampleLink}>
                <Text style={styles.sampleLinkText}>
                  Hoặc dùng mẫu để thử
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Trích xuất giao dịch"
              onPress={handleExtract}
              disabled={smsText.trim().length === 0}
              style={styles.submitBtn}
            />

            <Text style={styles.privacyNote}>
              🔒 Tin nhắn được xử lý cục bộ. Chúng tôi không lưu nội dung gốc.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Render: review ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => setPhase('paste')} title="Xác nhận giao dịch" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {amountUncertain || merchantUncertain || categoryUncertain ? (
            <View style={styles.uncertainNotice}>
              <Text style={styles.uncertainNoticeText}>
                Các trường viền cam cần kiểm tra lại trước khi xác nhận.
              </Text>
            </View>
          ) : null}

          {/* Amount */}
          <View style={[styles.card, amountUncertain && styles.cardUncertain]}>
            <TextInput
              label="Số tiền"
              value={amountRaw}
              onChangeText={(t) => {
                setAmountRaw(t.replace(/\D/g, ''));
                if (amountError) setAmountError(undefined);
                if (amountUncertain) setAmountUncertain(false);
              }}
              keyboardType="numeric"
              placeholder="0"
              error={amountError}
            />
            <Text style={styles.amountPreview}>
              {formatVND(parseInt(amountRaw, 10) || 0)}
            </Text>
          </View>

          {/* Merchant */}
          <View style={[styles.card, merchantUncertain && styles.cardUncertain]}>
            <TextInput
              label="Nơi bán / Mô tả"
              value={merchant}
              onChangeText={(t) => {
                setMerchant(t);
                if (merchantUncertain) setMerchantUncertain(false);
              }}
              placeholder="Tên cửa hàng, mô tả..."
            />
          </View>

          {/* Category */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Danh mục</Text>
            <TouchableOpacity
              style={[
                styles.selectRow,
                categoryUncertain && styles.selectRowUncertain,
              ]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.75}
            >
              {selectedCategory ? (
                <View style={styles.selectRowLeft}>
                  <View style={[styles.dot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={styles.selectValue}>{selectedCategory.nameVi}</Text>
                </View>
              ) : (
                <Text style={styles.selectPlaceholder}>Chọn danh mục</Text>
              )}
              {categoryUncertain ? (
                <Text style={styles.uncertainBadge}>?</Text>
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Wallet */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ví</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowWalletModal(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.selectValue}>{selectedWallet.name}</Text>
              <Text style={styles.chevron}>›</Text>
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

          <View style={styles.actionsRow}>
            <Button
              title="Dán lại"
              variant="secondary"
              onPress={() => setPhase('paste')}
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
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chọn danh mục</Text>
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
                  onPress={() => {
                    setCategoryId(item.id);
                    setCategoryUncertain(false);
                    setShowCategoryModal(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dotMd, { backgroundColor: item.color }]} />
                  <Text style={styles.listRowText}>{item.nameVi}</Text>
                  {categoryId === item.id ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Wallet modal */}
      <Modal
        visible={showWalletModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowWalletModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chọn ví</Text>
            <FlatList
              data={wallets}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listRow,
                    walletId === item.id && styles.listRowSelected,
                  ]}
                  onPress={() => {
                    setWalletId(item.id);
                    setShowWalletModal(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.walletEmoji}>
                    {item.type === 'basic' ? '💵' : item.type === 'linked' ? '🔗' : '🎯'}
                  </Text>
                  <Text style={styles.listRowText}>{item.name}</Text>
                  {walletId === item.id ? (
                    <Text style={styles.checkmark}>✓</Text>
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

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
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

  processingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  processingLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
  },

  intro: { marginBottom: SPACING[3] },
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

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  cardUncertain: {
    borderWidth: 2,
    borderColor: COLORS.calendar.uncategorized,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  smsInput: {
    minHeight: 140,
    maxHeight: 240,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[800],
    lineHeight: 22,
  },
  sampleLink: {
    marginTop: SPACING[2],
    alignSelf: 'flex-start',
  },
  sampleLinkText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.semibold,
  },

  amountPreview: {
    marginTop: SPACING[2],
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
  },

  uncertainNotice: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.calendar.uncategorized,
    ...SHADOW.sm,
  },
  uncertainNoticeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[700],
    lineHeight: 20,
  },

  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    minHeight: 48,
  },
  selectRowUncertain: {
    borderColor: COLORS.calendar.uncategorized,
    borderWidth: 2,
  },
  selectRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectValue: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[900] },
  selectPlaceholder: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[400] },
  chevron: { fontSize: FONT_SIZE.xl, color: COLORS.gray[400], marginLeft: SPACING[2] },
  uncertainBadge: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.calendar.uncategorized,
    marginLeft: SPACING[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING[2],
  },

  actionsRow: { flexDirection: 'row', gap: SPACING[3], marginTop: SPACING[2] },
  halfBtn: { flex: 1 },

  submitBtn: { marginTop: SPACING[2], marginBottom: SPACING[3] },

  privacyNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
    paddingHorizontal: SPACING[2],
  },

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
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING[2],
  },
  listRowSelected: {
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
  },
  listRowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[800],
    marginLeft: SPACING[2],
  },
  dotMd: { width: 14, height: 14, borderRadius: BORDER_RADIUS.full },
  checkmark: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  walletEmoji: { fontSize: 22 },
});
