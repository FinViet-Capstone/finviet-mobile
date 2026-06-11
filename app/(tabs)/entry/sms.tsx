import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";
import { MaterialIcon } from "@/components/common/MaterialIcon";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CATEGORIES } from "@/constants/categories";
import type { Category } from "@/constants/categories";
import { useExtractFromSMS, useWallets, useCreateTransaction } from "@/hooks";
import { PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD } from "@/constants/extraction";
import { formatVND } from "@/utils/formatters";
import { todayISO } from "@/utils/date";
import type { Wallet } from "@/types/wallet";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "paste" | "extracting" | "review";
type EntryType = "expense" | "income";

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: "Dán SMS",
  titleReview: "Xác nhận giao dịch",
  back: "arrow_back_ios",
  instruction: "Phân tích giao dịch tự động",
  instructionBody:
    "Dán tin nhắn biến động số dư từ ngân hàng hoặc ví điện tử. FinViet AI sẽ bóc tách thông tin cho bạn.",
  placeholder: "Dán nội dung tin nhắn biến động số dư tại đây...",
  aiBadge: "FinViet AI sẽ tự động phân tích số tiền, ngày tháng và danh mục.",
  processBtn: "Xử lý tin nhắn",
  confirmBtn: "Xác nhận",
  rePasteBtn: "Dán lại",
  guide: "Hướng dẫn nhanh",
  guideSteps: [
    "Mở ứng dụng ngân hàng hoặc tin nhắn SMS.",
    "Sao chép toàn bộ nội dung tin nhắn báo biến động số dư.",
    "Quay lại màn hình này và dán vào ô trống phía trên.",
  ],
  uncertainNotice: "Các trường viền cam cần kiểm tra lại trước khi xác nhận.",
  fieldAmount: "Số tiền",
  fieldMerchant: "Người nhận / Mô tả",
  fieldCategory: "Danh mục",
  fieldWallet: "Ví",
  fieldDate: "Ngày",
  pickCategory: "Chọn danh mục",
  sheetCategory: "Chọn danh mục",
  sheetWallet: "Chọn ví",
  tooShort: "Tin nhắn quá ngắn. Vui lòng dán toàn bộ tin nhắn ngân hàng.",
  saveOk: "Đã lưu giao dịch.",
  saveErr: "Không lưu được. Hãy thử lại.",
  expense: "Chi tiêu",
  income: "Thu nhập",
  noWallet: "Chưa chọn ví",
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SMSEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const initialISO = dateParam ?? todayISO();

  const extract = useExtractFromSMS();
  const createMutation = useCreateTransaction();
  const { data: walletData, isLoading: walletsLoading } = useWallets();

  const [phase, setPhase] = useState<Phase>("paste");
  const [smsText, setSmsText] = useState("");

  // Review fields
  const [amountRaw, setAmountRaw] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [merchant, setMerchant] = useState("");
  const [dateIso, setDateIso] = useState(initialISO);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  // Uncertain flags
  const [amountUncertain, setAmountUncertain] = useState(false);
  const [merchantUncertain, setMerchantUncertain] = useState(false);
  const [categoryUncertain, setCategoryUncertain] = useState(false);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    ? (CATEGORIES.find((c) => c.id === categoryId) ?? null)
    : null;
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? wallets[0];
  const amountNum = parseInt(amountRaw.replace(/\D/g, "") || "0", 10);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleExtract = () => {
    const trimmed = smsText.trim();
    if (trimmed.length < 10) {
      Alert.alert("", S.tooShort);
      return;
    }
    setPhase("extracting");
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
        setPhase("review");
      },
      onError: () => {
        Alert.alert(
          "Không trích xuất được",
          "Không thể tự động đọc tin nhắn.",
          [
            {
              text: "Nhập tay",
              onPress: () =>
                router.replace({
                  pathname: "/(tabs)/entry/manual",
                  params: dateParam ? { date: dateParam } : undefined,
                }),
            },
            { text: "Thử lại", onPress: () => setPhase("paste") },
          ],
        );
      },
    });
  };

  const handleConfirm = () => {
    if (amountNum <= 0) {
      setAmountError("Số tiền phải lớn hơn 0");
      return;
    }
    if (!walletId) {
      Alert.alert("", S.noWallet);
      return;
    }
    createMutation.mutate(
      {
        walletId,
        categoryId,
        amount: amountNum,
        type: entryType,
        description: merchant.trim() || null,
        merchant: merchant.trim() || null,
        transactionDate: dateIso,
        aiSuggestedCategoryId: categoryId,
        aiOverridden: false,
        entryMethod: "sms_paste",
      },
      {
        onSuccess: () =>
          Alert.alert("", S.saveOk, [
            { text: "OK", onPress: () => router.back() },
          ]),
        onError: () => Alert.alert("", S.saveErr),
      },
    );
  };

  const formatDate = (iso: string) => {
    const p = iso.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  // ── Extracting phase ────────────────────────────────────────────────────────

  if (phase === "extracting") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header title={S.title} onBack={() => router.back()} />
        <View style={styles.loadingBox}>
          <LoadingSpinner />
          <Text style={styles.loadingLabel}>Đang phân tích tin nhắn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Review phase ────────────────────────────────────────────────────────────

  if (phase === "review") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header title={S.titleReview} onBack={() => setPhase("paste")} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.reviewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Uncertain notice */}
            {(amountUncertain || merchantUncertain || categoryUncertain) && (
              <View style={styles.uncertainBanner}>
                <MaterialIcon name="warning" size={16} color={COLORS.warning} />
                <Text style={styles.uncertainText}>{S.uncertainNotice}</Text>
              </View>
            )}

            {/* Type toggle */}
            <View style={styles.typeToggleWrap}>
              <View style={styles.typeToggle}>
                {(["expense", "income"] as EntryType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.7}
                    style={[
                      styles.typeOption,
                      entryType === t &&
                        (t === "expense"
                          ? styles.typeExpenseActive
                          : styles.typeIncomeActive),
                    ]}
                    onPress={() => setEntryType(t)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        entryType === t && styles.typeOptionTextActive,
                        entryType === t &&
                          t === "expense" && { color: COLORS.error },
                        entryType === t &&
                          t === "income" && { color: COLORS.tertiary },
                      ]}
                    >
                      {t === "expense" ? S.expense : S.income}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount */}
            <View
              style={[
                styles.fieldCard,
                amountUncertain && styles.fieldCardUncertain,
              ]}
            >
              <Text style={styles.fieldLabel}>{S.fieldAmount}</Text>
              <RNTextInput
                value={amountRaw}
                onChangeText={(t) => {
                  setAmountRaw(t.replace(/\D/g, ""));
                  setAmountError(undefined);
                  setAmountUncertain(false);
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.outlineVariant}
                style={styles.fieldInput}
              />
              {amountNum > 0 && (
                <Text style={styles.amountPreview}>{formatVND(amountNum)}</Text>
              )}
              {amountError && (
                <Text style={styles.fieldError}>{amountError}</Text>
              )}
            </View>

            {/* Merchant */}
            <View
              style={[
                styles.fieldCard,
                merchantUncertain && styles.fieldCardUncertain,
              ]}
            >
              <Text style={styles.fieldLabel}>{S.fieldMerchant}</Text>
              <RNTextInput
                value={merchant}
                onChangeText={(t) => {
                  setMerchant(t);
                  setMerchantUncertain(false);
                }}
                placeholder="Tên cửa hàng, mô tả..."
                placeholderTextColor={COLORS.outlineVariant}
                style={styles.fieldInput}
              />
            </View>

            {/* Category */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.fieldCard,
                categoryUncertain && styles.fieldCardUncertain,
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.fieldLabel}>{S.fieldCategory}</Text>
              <View style={styles.fieldRowValue}>
                {selectedCategory ? (
                  <>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: selectedCategory.color },
                      ]}
                    />
                    <Text style={styles.fieldValueText}>
                      {selectedCategory.nameVi}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.fieldPlaceholder}>{S.pickCategory}</Text>
                )}
                {categoryUncertain ? (
                  <Text style={styles.uncertainBadge}>?</Text>
                ) : (
                  <MaterialIcon
                    name="chevron_right"
                    size={20}
                    color={COLORS.outlineVariant}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Wallet */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.fieldCard}
              onPress={() => setShowWalletModal(true)}
            >
              <Text style={styles.fieldLabel}>{S.fieldWallet}</Text>
              <View style={styles.fieldRowValue}>
                <Text style={styles.fieldValueText}>
                  {selectedWallet?.name ?? ""}
                </Text>
                <MaterialIcon
                  name="chevron_right"
                  size={20}
                  color={COLORS.outlineVariant}
                />
              </View>
            </TouchableOpacity>

            {/* Date */}
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{S.fieldDate}</Text>
              <Text style={styles.fieldValueText}>{formatDate(dateIso)}</Text>
            </View>

            {/* Actions */}
            <View style={styles.reviewActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.rePasteBtn}
                onPress={() => setPhase("paste")}
              >
                <Text style={styles.rePasteBtnText}>{S.rePasteBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.confirmBtn,
                  createMutation.isPending && styles.disabled,
                ]}
                onPress={handleConfirm}
                disabled={createMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{S.confirmBtn}</Text>
                <MaterialIcon
                  name="arrow_forward"
                  size={18}
                  color={COLORS.onPrimary}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category modal */}
        <PickerModal
          visible={showCategoryModal}
          title={S.sheetCategory}
          onClose={() => setShowCategoryModal(false)}
        >
          <FlatList
            data={[...CATEGORIES]}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sheetRow,
                  categoryId === item.id && styles.sheetRowSelected,
                ]}
                onPress={() => {
                  setCategoryId(item.id);
                  setCategoryUncertain(false);
                  setShowCategoryModal(false);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.sheetDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.sheetRowText}>{item.nameVi}</Text>
                {categoryId === item.id && (
                  <MaterialIcon name="check" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </PickerModal>

        {/* Wallet modal */}
        <PickerModal
          visible={showWalletModal}
          title={S.sheetWallet}
          onClose={() => setShowWalletModal(false)}
        >
          <FlatList
            data={wallets}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sheetRow,
                  walletId === item.id && styles.sheetRowSelected,
                ]}
                onPress={() => {
                  setWalletId(item.id);
                  setShowWalletModal(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcon
                  name="account_balance_wallet"
                  size={18}
                  color={COLORS.onSurfaceVariant}
                />
                <Text style={styles.sheetRowText}>{item.name}</Text>
                {walletId === item.id && (
                  <MaterialIcon name="check" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </PickerModal>
      </SafeAreaView>
    );
  }

  // ── Paste phase ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header
        title={S.title}
        onBack={() => router.back()}
        rightLabel="Tiếp tục"
        onRightPress={smsText.trim().length >= 10 ? handleExtract : undefined}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.pasteContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Instruction */}
          <View style={styles.instructionWrap}>
            <Text style={styles.instructionTitle}>{S.instruction}</Text>
            <Text style={styles.instructionBody}>{S.instructionBody}</Text>
          </View>

          {/* Textarea */}
          <View style={styles.textareaWrap}>
            <RNTextInput
              value={smsText}
              onChangeText={setSmsText}
              placeholder={S.placeholder}
              placeholderTextColor={COLORS.outlineVariant}
              style={styles.textarea}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            {/* Contextual action buttons */}
            <View style={styles.textareaActions}>
              {smsText.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.textareaActionBtn}
                  onPress={() => setSmsText("")}
                >
                  <MaterialIcon
                    name="close"
                    size={16}
                    color={COLORS.onSurface}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.textareaActionBtnPrimary}
              >
                <MaterialIcon
                  name="content_paste"
                  size={16}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Guide */}
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <MaterialIcon
                name="lightbulb"
                size={18}
                color={COLORS.secondary}
              />
              <Text style={styles.guideTitle}>{S.guide}</Text>
            </View>
            {S.guideSteps.map((step, i) => (
              <Text
                key={i}
                style={styles.guideStep}
              >{`${i + 1}. ${step}`}</Text>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom action area */}
      <View style={styles.bottomArea}>
        <View style={styles.aiBadge}>
          <MaterialIcon name="auto_awesome" size={13} color={COLORS.primary} />
          <Text style={styles.aiBadgeText}>{S.aiBadge}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.processBtn,
            smsText.trim().length < 10 && styles.disabled,
          ]}
          onPress={handleExtract}
          disabled={smsText.trim().length < 10}
        >
          <Text style={styles.processBtnText}>{S.processBtn}</Text>
          <MaterialIcon
            name="arrow_forward"
            size={18}
            color={COLORS.onPrimary}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({
  title,
  onBack,
  rightLabel,
  onRightPress,
}: {
  title: string;
  onBack: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.headerBtn}
        onPress={onBack}
      >
        <MaterialIcon name="arrow_back_ios" size={20} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightLabel ? (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerBtn}
          onPress={onRightPress}
          disabled={!onRightPress}
        >
          <Text style={[styles.headerRight, !onRightPress && styles.disabled]}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );
}

function PickerModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[4],
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerBtn: { minWidth: 56, alignItems: "center" },
  headerTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  headerRight: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING[3],
  },
  loadingLabel: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },

  // Paste phase
  pasteContent: { padding: SPACING[4], gap: SPACING[4] },
  instructionWrap: { gap: SPACING[1] },
  instructionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  instructionBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },

  textareaWrap: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minHeight: 200,
    position: "relative",
  },
  textarea: {
    minHeight: 200,
    padding: SPACING[4],
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    lineHeight: 24,
  },
  textareaActions: {
    position: "absolute",
    bottom: SPACING[3],
    right: SPACING[3],
    flexDirection: "row",
    gap: SPACING[2],
  },
  textareaActionBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  textareaActionBtnPrimary: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.primary}25`,
    alignItems: "center",
    justifyContent: "center",
  },

  guideCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS["2xl"],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING[2],
  },
  guideHeader: { flexDirection: "row", alignItems: "center", gap: SPACING[2] },
  guideTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.secondary,
  },
  guideStep: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },

  bottomArea: {
    backgroundColor: `${COLORS.surface}E6`,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[4],
    gap: SPACING[2],
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING[1],
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  aiBadgeText: { fontSize: 11, color: COLORS.primary },
  processBtn: {
    height: 56,
    backgroundColor: COLORS.inversePrimary,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING[2],
  },
  processBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },

  // Review phase
  reviewContent: { padding: SPACING[4], gap: SPACING[3] },
  typeToggleWrap: {},
  typeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: "center",
    borderRadius: BORDER_RADIUS.full,
  },
  typeExpenseActive: { backgroundColor: `${COLORS.error}20` },
  typeIncomeActive: { backgroundColor: `${COLORS.tertiary}20` },
  typeOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
  },
  typeOptionTextActive: { fontWeight: FONT_WEIGHT.semibold },
  uncertainBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[2],
    backgroundColor: `${COLORS.warning}20`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: `${COLORS.warning}40`,
  },
  uncertainText: { fontSize: FONT_SIZE.sm, color: COLORS.warning, flex: 1 },

  fieldCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING[1],
  },
  fieldCardUncertain: { borderColor: COLORS.warning, borderWidth: 1.5 },
  fieldLabel: { fontSize: FONT_SIZE.xs, color: COLORS.onSurfaceVariant },
  fieldInput: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
    padding: 0,
  },
  fieldValueText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurface,
  },
  fieldPlaceholder: { fontSize: FONT_SIZE.base, color: COLORS.outlineVariant },
  fieldRowValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[2],
  },
  fieldError: { fontSize: FONT_SIZE.xs, color: COLORS.error },
  amountPreview: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  dot: { width: 10, height: 10, borderRadius: BORDER_RADIUS.full },
  uncertainBadge: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
    marginLeft: SPACING[1],
  },

  reviewActions: { flexDirection: "row", gap: SPACING[3] },
  rePasteBtn: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  rePasteBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.inversePrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING[2],
  },
  confirmBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onPrimary,
  },

  disabled: { opacity: 0.45 },

  // Modal / sheet
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderTopLeftRadius: BORDER_RADIUS["2xl"],
    borderTopRightRadius: BORDER_RADIUS["2xl"],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[4],
    maxHeight: "70%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: "center",
    marginBottom: SPACING[4],
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[3],
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    gap: SPACING[3],
  },
  sheetRowSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
    marginVertical: SPACING[1],
  },
  sheetDot: {
    width: 14,
    height: 14,
    borderRadius: BORDER_RADIUS.full,
    flexShrink: 0,
  },
  sheetRowText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.onSurface },
});
