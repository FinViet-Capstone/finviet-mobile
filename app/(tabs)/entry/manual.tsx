/**
 * ManualEntryScreen — app/(tabs)/entry/manual.tsx
 *
 * Fields: Amount · Type toggle · Category · Wallet · Date · Payee · Note
 * Accepts optional `date` query-param ("YYYY-MM-DD") from Calendar double-tap.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod";

import {
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  withAlpha,
} from "@/theme";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { CATEGORIES } from "@/constants/categories";
import type { Category } from "@/constants/categories";
import { MaterialIcon } from "@/components/common/MaterialIcon";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { NumericKeypad, NUMPAD_HEIGHT } from "@/components/common/NumericKeypad";
import { DraggableSheet } from "@/components/common/DraggableSheet";
import { CategoryPickerSheet } from "@/components/categories";
import { DatePickerField } from "@/components/common/DatePickerField";
import { TextInput } from "@/components/common/TextInput";
import { useWallets, useCreateTransaction } from "@/hooks";
import type { Wallet } from "@/types/wallet";
import { formatVND } from "@/utils/formatters";
import { todayISO } from "@/utils/date";
import { getApiErrorMessage } from "@/utils/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType = "expense" | "income";

// ─── Validation ───────────────────────────────────────────────────────────────

const entrySchema = z.object({
  amount: z
    .number({ invalid_type_error: "Vui lòng nhập số tiền" })
    .positive("Số tiền phải lớn hơn 0"),
});

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  titleAdd: "Thêm Giao Dịch",
  cancel: "Hủy",
  save: "Lưu",
  expense: "Chi tiêu",
  income: "Thu nhập",
  fieldWallet: "Ví",
  fieldCategory: "Danh mục",
  fieldDate: "Ngày",
  fieldPayee: "Tên thụ hưởng",
  fieldNote: "Ghi chú",
  payeePlaceholder: "Không bắt buộc",
  notePlaceholder: "Không bắt buộc",
  pickCategory: "Chọn danh mục",
  pickWallet: "Chọn ví",
  sheetCategory: "Chọn danh mục",
  sheetWallet: "Chọn ví",
  saveSuccess: "Giao dịch đã được lưu!",
  saveError: "Không thể lưu. Hãy thử lại.",
  noWallet: "Chưa chọn ví. Hãy tạo ví cơ bản trước.",
  insufficient: (s: string) => `Số dư ví không đủ (hiện có: ${s})`,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ManualEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { data: walletData, isLoading } = useWallets();
  const createMutation = useCreateTransaction();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialISO = dateParam ?? todayISO();

  // Form state
  const [amountRaw, setAmountRaw] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState(initialISO);
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();
  // Numpad is a modal overlay (backdrop + slide-up). Auto-open on mount since the
  // amount is the primary field; tapping the amount re-opens it, Done/outside closes.
  const [amountFocused, setAmountFocused] = useState(true);

  // Manual entries can only target basic wallets — bank-linked wallets are read-only
  // (their transactions come from provider sync), and the API rejects writes to them.
  const basicWallets = (walletData?.wallets ?? []).filter((w) => w.type !== "linked");

  // Pre-select the first basic wallet.
  useEffect(() => {
    if (basicWallets.length > 0 && selectedWalletId === null) {
      setSelectedWalletId(basicWallets[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicWallets.length]);

  if (isLoading || !walletData) return <LoadingSpinner />;

  const wallets: Wallet[] = basicWallets;
  const effectiveWalletId = selectedWalletId ?? wallets[0]?.id;
  const selectedCategory = selectedCategoryId
    ? (CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null)
    : null;
  const selectedWallet =
    wallets.find((w) => w.id === effectiveWalletId) ?? wallets[0];

  const amountNum = parseInt(amountRaw.replace(/\D/g, "") || "0", 10);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAmountKey = (key: string) => {
    if (key === "del") {
      setAmountRaw((prev) => prev.slice(0, -1));
    } else if (key === "000") {
      setAmountRaw((prev) => (prev === "" ? "" : prev + "000"));
    } else {
      setAmountRaw((prev) => {
        if (prev === "0" && key !== ".") return key;
        return prev + key;
      });
    }
    if (amountError) setAmountError(undefined);
  };

  const handleSubmit = () => {
    const result = entrySchema.safeParse({ amount: amountNum });
    if (!result.success) {
      setAmountError(result.error.flatten().fieldErrors.amount?.[0]);
      return;
    }

    if (!effectiveWalletId) {
      Alert.alert("", S.noWallet);
      return;
    }

    // Client-side guard: an expense can't exceed the wallet balance (the API enforces
    // this too and returns 422 insufficient_balance — catch it early with a clear message).
    if (entryType === "expense" && selectedWallet && amountNum > selectedWallet.balance) {
      setAmountError(S.insufficient(formatVND(selectedWallet.balance)));
      return;
    }

    createMutation.mutate(
      {
        walletId: effectiveWalletId,
        categoryId: selectedCategoryId,
        amount: amountNum,
        type: entryType,
        description: note.trim() || null,
        merchant: payee.trim() || null,
        transactionDate: dateIso,
        entryMethod: "manual",
      },
      {
        onSuccess: () =>
          Alert.alert("", S.saveSuccess, [
            { text: "OK", onPress: () => router.back() },
          ]),
        onError: (err) => Alert.alert("", getApiErrorMessage(err, S.saveError)),
      },
    );
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const formatDateDisplay = (iso: string) => {
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const isExpense = entryType === "expense";
  const amountColor = isExpense ? colors.error : colors.tertiary;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.topBarBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.topBarCancel}>{S.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{S.titleAdd}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.topBarBtn}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          <Text
            style={[
              styles.topBarSave,
              createMutation.isPending && styles.disabled,
            ]}
          >
            {S.save}
          </Text>
        </TouchableOpacity>
      </View>

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
              onPress={() => { setEntryType(t); setSelectedCategoryId(null); }}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  entryType === t && styles.typeOptionTextActive,
                  entryType === t && t === "expense" && { color: colors.error },
                  entryType === t &&
                    t === "income" && { color: colors.tertiary },
                ]}
              >
                {t === "expense" ? S.expense : S.income}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount display — tap to (re)open the numpad */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.amountSection}
        onPress={() => setAmountFocused(true)}
      >
        <Text style={[styles.amountDisplay, { color: amountColor }]}>
          {amountNum > 0 ? formatVND(amountNum) : "0 đ"}
        </Text>
        {amountError ? (
          <Text style={styles.amountError}>{amountError}</Text>
        ) : null}
      </TouchableOpacity>

      {/* Form fields */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.fieldsScroll}
          contentContainerStyle={[styles.fieldsContent, amountFocused && { paddingBottom: NUMPAD_HEIGHT }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* Wallet */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.fieldRow}
            onPress={() => setShowWalletModal(true)}
          >
            <View
              style={[
                styles.fieldIconWrap,
                { backgroundColor: withAlpha(colors.primary, 0.13) },
              ]}
            >
              <MaterialIcon
                name="account_balance_wallet"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldWallet}</Text>
              <Text style={styles.fieldValue}>
                {selectedWallet?.name ?? S.pickWallet}
              </Text>
            </View>
            <MaterialIcon
              name="chevron_right"
              size={20}
              color={colors.outlineVariant}
            />
          </TouchableOpacity>

          {/* Category */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.fieldRow}
            onPress={() => setShowCategoryModal(true)}
          >
            <View
              style={[
                styles.fieldIconWrap,
                {
                  backgroundColor: selectedCategory
                    ? `${selectedCategory.color}25`
                    : withAlpha(colors.secondary, 0.13),
                },
              ]}
            >
              <MaterialIcon
                name="category"
                size={20}
                color={selectedCategory?.color ?? colors.secondary}
              />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldCategory}</Text>
              <Text
                style={[
                  styles.fieldValue,
                  !selectedCategory && styles.fieldPlaceholder,
                ]}
              >
                {selectedCategory?.nameVi ?? S.pickCategory}
              </Text>
            </View>
            <MaterialIcon
              name="chevron_right"
              size={20}
              color={colors.outlineVariant}
            />
          </TouchableOpacity>

          {/* Date */}
          <DatePickerField
            value={dateIso}
            onChange={setDateIso}
            customTrigger={(openPicker) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.fieldRow}
                onPress={openPicker}
              >
                <View
                  style={[
                    styles.fieldIconWrap,
                    { backgroundColor: withAlpha(colors.primary, 0.08) },
                  ]}
                >
                  <MaterialIcon
                    name="calendar_today"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.fieldTextWrap}>
                  <Text style={styles.fieldLabel}>{S.fieldDate}</Text>
                  <Text style={styles.fieldValue}>
                    {formatDateDisplay(dateIso)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Payee */}
          <View style={styles.fieldRow}>
            <View
              style={[
                styles.fieldIconWrap,
                { backgroundColor: withAlpha(colors.outline, 0.13) },
              ]}
            >
              <MaterialIcon name="person" size={20} color={colors.outline} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldPayee}</Text>
              <TextInput
                variant="inline"
                value={payee}
                onChangeText={setPayee}
                placeholder={S.payeePlaceholder}
              />
            </View>
          </View>

          {/* Note */}
          <View style={styles.fieldRow}>
            <View
              style={[
                styles.fieldIconWrap,
                { backgroundColor: withAlpha(colors.outline, 0.13) },
              ]}
            >
              <MaterialIcon name="notes" size={20} color={colors.outline} />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.fieldLabel}>{S.fieldNote}</Text>
              <TextInput
                variant="inline"
                value={note}
                onChangeText={setNote}
                placeholder={S.notePlaceholder}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom numpad — modal overlay, opens when the amount is focused */}
      <NumericKeypad
        visible={amountFocused}
        onClose={() => setAmountFocused(false)}
        onNumberPress={(key) => handleAmountKey(key)}
        onBackspace={() => handleAmountKey("del")}
        onClear={() => {
          setAmountRaw("");
          setAmountError(undefined);
        }}
        onDone={() => setAmountFocused(false)}
      />

      {/* ── Category Sheet ── */}
      <CategoryPickerSheet
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={S.sheetCategory}
        entryType={entryType}
        selectedCategoryId={selectedCategoryId}
        onSelect={(id) => {
          setSelectedCategoryId(id);
          setShowCategoryModal(false);
        }}
      />

      {/* ── Wallet Sheet ── */}
      <DraggableSheet
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{S.sheetWallet}</Text>
          <FlatList
            data={wallets}
            keyExtractor={(item) => item.id}
            style={styles.sheetList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.sheetEmpty}>
                Chưa có ví nào. Hãy tạo ví ở tab Ví trước khi thêm giao dịch.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sheetRow,
                  selectedWalletId === item.id && styles.sheetRowSelected,
                ]}
                onPress={() => {
                  setSelectedWalletId(item.id);
                  setShowWalletModal(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcon
                  name="account_balance_wallet"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
                <Text style={styles.sheetRowText}>{item.name}</Text>
                {selectedWalletId === item.id && (
                  <MaterialIcon name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </DraggableSheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[4],
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  topBarBtn: { minWidth: 56, alignItems: "center" },
  topBarTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  topBarCancel: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
  },
  topBarSave: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
  },
  disabled: { opacity: 0.5 },

  // Type toggle
  typeToggleWrap: { paddingHorizontal: SPACING[4], paddingTop: SPACING[3] },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: "center",
    borderRadius: BORDER_RADIUS.full,
  },
  typeExpenseActive: {
    backgroundColor: withAlpha(colors.error, 0.13),
  },
  typeIncomeActive: {
    backgroundColor: withAlpha(colors.tertiary, 0.13),
  },
  typeOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.onSurfaceVariant,
  },
  typeOptionTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Amount
  amountSection: {
    alignItems: "center",
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  amountDisplay: {
    fontSize: FONT_SIZE["4xl"],
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -1,
  },
  amountError: {
    fontSize: FONT_SIZE.xs,
    color: colors.error,
    marginTop: SPACING[1],
  },

  // Fields scroll
  fieldsScroll: { flex: 1 },
  fieldsContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
    gap: SPACING[2],
  },

  // Field row
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[3],
    minHeight: 64,
  },
  fieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fieldTextWrap: { flex: 1 },
  fieldLabel: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: FONT_SIZE.base,
    color: colors.onSurface,
    fontWeight: FONT_WEIGHT.medium,
  },
  fieldPlaceholder: {
    color: colors.outlineVariant,
    fontWeight: FONT_WEIGHT.normal,
  },

  // Modal
  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
  },
  // Bounded so the list scrolls inside the sheet instead of growing past the top.
  sheetList: {
    maxHeight: 380,
  },
  sheetEmpty: {
    paddingVertical: SPACING[6],
    textAlign: "center",
    color: colors.onSurfaceVariant,
    fontSize: FONT_SIZE.sm,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
    marginBottom: SPACING[3],
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: SPACING[3],
  },
  sheetRowSelected: {
    backgroundColor: withAlpha(colors.primary, 0.06),
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
    marginVertical: SPACING[1],
  },
  sheetRowText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: colors.onSurface,
  },
  });
}
