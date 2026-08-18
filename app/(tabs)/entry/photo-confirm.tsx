import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import {
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  withAlpha,
} from "@/theme";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { MaterialIcon } from "@/components/common/MaterialIcon";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DraggableSheet } from "@/components/common/DraggableSheet";
import { CATEGORIES } from "@/constants/categories";
import { CategoryPickerSheet } from "@/components/categories";
import { formatVND } from "@/utils/formatters";
import { useExtractFromPhoto, useCreateTransaction, useWallets } from "@/hooks";
import type { Wallet } from "@/types/wallet";
import { PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD } from "@/constants/extraction";
import { getApiErrorMessage } from "@/utils/errors";

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: "Xác nhận giao dịch",
  back: "arrow_back",
  processing: "Đang phân tích ảnh...",
  failedExtraction: "Không đọc được ảnh. Vui lòng nhập thủ công.",
  ocrUnavailableTitle: "Tính năng đang phát triển",
  ocrUnavailableMsg:
    "Tính năng quét ảnh hóa đơn bằng AI đang được phát triển. Vui lòng nhập giao dịch thủ công.",
  stay: "Ở lại",
  goManual: "Nhập thủ công",
  uncertainNotice: "Các trường màu cam cần kiểm tra lại.",
  selectAll: "Chọn tất cả",
  deselectAll: "Bỏ chọn tất cả",
  selectedCount: (selected: number, total: number) => `${selected}/${total} đã chọn`,
  confirmAll: "Chấp nhận tất cả",
  needCategorize: (n: number) => `Cần phân loại ${n} giao dịch`,
  needCategory: "Chọn danh mục →",
  retake: "Chụp lại",
  amountLabel: "Số tiền",
  merchantLabel: "Người nhận",
  categoryLabel: "Danh mục",
  dateLabel: "Ngày",
  pickCategory: "Chọn danh mục",
  uncategorized: "Chưa phân loại",
  duplicate: "Có thể trùng",
  noWallet: "Chưa có ví",
  noWalletMsg: "Hãy tạo ít nhất một ví trước khi lưu.",
  savedMsg: (n: number) => `Đã lưu ${n} giao dịch`,
  saveError: "Không lưu được. Hãy thử lại.",
  imageOf: (i: number, n: number) => `Ảnh ${i}/${n}`,
  fieldWallet: "Ví",
  pickWallet: "Chọn ví",
  sheetWallet: "Chọn ví",
  sheetWalletEmpty: "Chưa có ví nào. Hãy tạo ví ở tab Ví trước khi lưu.",
  insufficient: (s: string) => `Số dư ví không đủ (hiện có: ${s})`,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedRow {
  uri: string;
  status: "processing" | "done" | "failed";
  amount: number;
  merchant: string;
  dateIso: string;
  categoryId: string | null;
  amountUncertain: boolean;
  merchantUncertain: boolean;
  categoryUncertain: boolean;
  selected: boolean;
  isDuplicate: boolean;
  failedMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/** True when the backend rejected the request because no OCR provider is
 * configured server-side yet (finviet-be's IReceiptOcrService placeholder),
 * as opposed to a transient/per-image failure. */
function isOcrNotConfigured(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.data?.code === "ocr_not_configured";
}

function isUncertain(row: ExtractedRow): boolean {
  return row.amountUncertain || row.merchantUncertain || row.categoryUncertain;
}

// ─── Review Row ───────────────────────────────────────────────────────────────

function ReviewRow({
  row,
  index,
  total,
  blocking,
  onToggle,
  onEditCategory,
}: {
  row: ExtractedRow;
  index: number;
  total: number;
  /** Selected + extracted but has no category → blocks the batch submit. */
  blocking: boolean;
  onToggle: () => void;
  onEditCategory: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cat = row.categoryId
    ? (CATEGORIES.find((c) => c.id === row.categoryId) ?? null)
    : null;
  const uncertain = isUncertain(row);
  const isFailed = row.status === "failed";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.reviewRow,
        !row.selected && styles.reviewRowDeselected,
        uncertain && styles.reviewRowUncertain,
        row.isDuplicate && styles.reviewRowDuplicate,
        isFailed && styles.reviewRowFailed,
        blocking && styles.reviewRowBlocking,
      ]}
      onPress={onToggle}
    >
      {/* Thumbnail + checkbox */}
      <View style={styles.reviewThumbWrap}>
        <Image
          source={{ uri: row.uri }}
          style={styles.reviewThumb}
          resizeMode="cover"
        />
        <View style={styles.reviewCheckOverlay}>
          <MaterialIcon
            name={row.selected ? "check_circle" : "radio_button_unchecked"}
            size={20}
            color={row.selected ? colors.primary : colors.onSurfaceVariant}
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.reviewContent}>
        <View style={styles.reviewTopRow}>
          <Text style={styles.reviewImageLabel}>
            {S.imageOf(index + 1, total)}
          </Text>
          <View style={styles.reviewBadges}>
            {uncertain && (
              <View style={styles.uncertainBadge}>
                <MaterialIcon
                  name="warning"
                  size={12}
                  color={colors.secondary}
                />
                <Text style={styles.uncertainBadgeText}>Cần kiểm tra</Text>
              </View>
            )}
            {row.isDuplicate && (
              <View style={styles.dupBadge}>
                <Text style={styles.dupBadgeText}>{S.duplicate}</Text>
              </View>
            )}
          </View>
        </View>

        {isFailed ? (
          <Text style={styles.failedText}>{row.failedMessage ?? S.failedExtraction}</Text>
        ) : (
          <>
            {/* Amount */}
            <View style={styles.reviewField}>
              <Text
                style={[
                  styles.reviewFieldLabel,
                  row.amountUncertain && styles.uncertainLabel,
                ]}
              >
                {S.amountLabel}
              </Text>
              <Text
                style={[
                  styles.reviewFieldValue,
                  row.amountUncertain && styles.uncertainValue,
                ]}
              >
                {row.amount > 0 ? formatVND(row.amount) : "—"}
              </Text>
            </View>

            {/* Merchant */}
            <View style={styles.reviewField}>
              <Text
                style={[
                  styles.reviewFieldLabel,
                  row.merchantUncertain && styles.uncertainLabel,
                ]}
              >
                {S.merchantLabel}
              </Text>
              <Text
                style={[
                  styles.reviewFieldValue,
                  row.merchantUncertain && styles.uncertainValue,
                ]}
                numberOfLines={1}
              >
                {row.merchant || "—"}
              </Text>
            </View>

            {/* Category — tappable */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.reviewField}
              onPress={onEditCategory}
            >
              <Text
                style={[
                  styles.reviewFieldLabel,
                  row.categoryUncertain && styles.uncertainLabel,
                ]}
              >
                {S.categoryLabel}
              </Text>
              <View style={styles.reviewCategoryRow}>
                {cat ? (
                  <>
                    <View
                      style={[styles.catDot, { backgroundColor: cat.color }]}
                    />
                    <Text
                      style={[
                        styles.reviewFieldValue,
                        row.categoryUncertain && styles.uncertainValue,
                      ]}
                    >
                      {cat.nameVi}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.uncategorizedText,
                      blocking && styles.needCategoryText,
                    ]}
                  >
                    {blocking ? S.needCategory : S.uncategorized}
                  </Text>
                )}
                <MaterialIcon
                  name="chevron_right"
                  size={16}
                  color={blocking ? colors.error : colors.onSurfaceVariant}
                />
              </View>
            </TouchableOpacity>

            {/* Date */}
            <View style={styles.reviewField}>
              <Text style={styles.reviewFieldLabel}>{S.dateLabel}</Text>
              <Text style={styles.reviewFieldValue}>
                {formatDate(row.dateIso)}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PhotoConfirmScreen() {
  const router = useRouter();
  const { uris: rawUris, date: dateParam } = useLocalSearchParams<{
    uris?: string;
    date?: string;
  }>();
  const extract = useExtractFromPhoto();
  const createMutation = useCreateTransaction();
  const { data: walletsData } = useWallets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const uris: string[] = (() => {
    try {
      return JSON.parse(rawUris ?? "[]");
    } catch {
      return [];
    }
  })();

  const [rows, setRows] = useState<ExtractedRow[]>(
    uris.map((uri) => ({
      uri,
      status: "processing",
      amount: 0,
      merchant: "",
      dateIso: dateParam ?? todayISO(),
      categoryId: null,
      amountUncertain: false,
      merchantUncertain: false,
      categoryUncertain: false,
      selected: true,
      isDuplicate: false,
    })),
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const ocrUnavailableAlertShown = useRef(false);

  // Photo entries can only target basic wallets — bank-linked wallets are
  // read-only (their transactions come from provider sync).
  const basicWallets = (walletsData?.wallets ?? []).filter((w) => w.type !== "linked");
  const selectedWallet =
    basicWallets.find((w) => w.id === selectedWalletId) ?? basicWallets[0];

  // Pre-select the first basic wallet so the confirm button isn't stuck disabled.
  useEffect(() => {
    if (!selectedWalletId && basicWallets.length > 0) {
      setSelectedWalletId(basicWallets[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicWallets.length]);

  // Extract each image
  useEffect(() => {
    uris.forEach((uri, idx) => {
      extract.mutate(uri, {
        onSuccess: (result) => {
          setRows((prev) => {
            const updated = prev.map((r, i) =>
              i !== idx
                ? r
                : {
                    ...r,
                    status: "done" as const,
                    amount: result.amount ?? 0,
                    merchant: result.merchant ?? "",
                    dateIso: result.transactionDate,
                    categoryId: result.categoryId,
                    amountUncertain:
                      result.confidence.amount <
                      PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD,
                    merchantUncertain:
                      result.confidence.merchant <
                      PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD,
                    categoryUncertain:
                      result.confidence.categoryId <
                      PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD,
                  },
            );
            // Mark duplicates: same amount + merchant + date
            const done = updated.filter((r) => r.status === "done");
            return updated.map((r, i) => {
              if (r.status !== "done") return r;
              const isDuplicate = done.some(
                (other, oi) =>
                  oi !== i &&
                  other.amount === r.amount &&
                  other.merchant === r.merchant &&
                  other.dateIso === r.dateIso,
              );
              return { ...r, isDuplicate };
            });
          });
        },
        onError: (err) => {
          const failedMessage = getApiErrorMessage(err, S.failedExtraction);
          setRows((prev) =>
            prev.map((r, i) =>
              i === idx
                ? { ...r, status: "failed" as const, selected: false, failedMessage }
                : r,
            ),
          );
          if (isOcrNotConfigured(err) && !ocrUnavailableAlertShown.current) {
            ocrUnavailableAlertShown.current = true;
            Alert.alert(S.ocrUnavailableTitle, S.ocrUnavailableMsg, [
              { text: S.stay, style: "cancel" },
              {
                text: S.goManual,
                onPress: () =>
                  router.replace({
                    pathname: "/(tabs)/entry/manual",
                    ...(dateParam ? { params: { date: dateParam } } : {}),
                  }),
              },
            ]);
          }
        },
      });
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allProcessing = rows.every((r) => r.status === "processing");

  const handleToggle = useCallback((idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)),
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    setRows((prev) => {
      const shouldSelectAll = !prev.every((r) => r.selected);
      return prev.map((r) => ({ ...r, selected: shouldSelectAll }));
    });
  }, []);

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      setRows((prev) =>
        prev.map((r, i) =>
          i === editingIdx ? { ...r, categoryId, categoryUncertain: false } : r,
        ),
      );
      setEditingIdx(null);
    },
    [editingIdx],
  );

  const handleConfirmAll = useCallback(async () => {
    if (!selectedWallet) {
      Alert.alert(S.noWallet, S.noWalletMsg);
      return;
    }

    const toSave = rows.filter(
      (r) => r.selected && r.status === "done" && r.amount > 0,
    );
    if (!toSave.length) return;
    // Strict gate: never commit a row without a category (defensive — the button
    // is already disabled while any savable row is uncategorized).
    if (toSave.some((r) => r.categoryId === null)) return;

    // Client-side guard: the batch can't exceed the selected wallet's balance
    // (the API enforces this too and returns 422 insufficient_balance — catch
    // it early with a clear message instead of a mid-batch failure).
    const totalAmount = toSave.reduce((sum, r) => sum + r.amount, 0);
    if (totalAmount > selectedWallet.balance) {
      Alert.alert("", S.insufficient(formatVND(selectedWallet.balance)));
      return;
    }

    setIsImporting(true);
    try {
      for (const row of toSave) {
        await createMutation.mutateAsync({
          walletId: selectedWallet.id,
          categoryId: row.categoryId,
          amount: row.amount,
          type: "expense",
          description: row.merchant.trim() || null,
          merchant: row.merchant.trim() || null,
          transactionDate: row.dateIso,
          entryMethod: "photo",
        });
      }
      Alert.alert("", S.savedMsg(toSave.length), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("", getApiErrorMessage(err, S.saveError));
    } finally {
      setIsImporting(false);
    }
  }, [rows, selectedWallet, createMutation, router]);

  // Strict gate (Path A): the batch can only be submitted when every selected,
  // successfully-extracted row has a category. Uncategorized selected rows block it.
  const savableRows = rows.filter(
    (r) => r.selected && r.status === "done" && r.amount > 0,
  );
  const unresolvedCount = savableRows.filter(
    (r) => r.categoryId === null,
  ).length;
  const isReadyToSubmit = savableRows.length > 0 && unresolvedCount === 0;
  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const noneSelected = selectedCount === 0;

  if (allProcessing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <MaterialIcon name={S.back} size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{S.title}</Text>
          <View style={styles.headerBtn} />
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialIcon name={S.back} size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Wallet */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.walletFieldRow}
        onPress={() => setShowWalletModal(true)}
      >
        <View style={styles.walletFieldIconWrap}>
          <MaterialIcon
            name="account_balance_wallet"
            size={18}
            color={colors.primary}
          />
        </View>
        <View style={styles.walletFieldTextWrap}>
          <Text style={styles.walletFieldLabel}>{S.fieldWallet}</Text>
          <Text style={styles.walletFieldValue}>
            {selectedWallet?.name ?? S.pickWallet}
          </Text>
        </View>
        <MaterialIcon
          name="chevron_right"
          size={20}
          color={colors.outlineVariant}
        />
      </TouchableOpacity>

      {rows.length > 1 && (
        <View style={styles.selectAllRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.selectAllToggle}
            onPress={handleToggleAll}
          >
            <MaterialIcon
              name={
                allSelected
                  ? "check_box"
                  : noneSelected
                    ? "check_box_outline_blank"
                    : "indeterminate_check_box"
              }
              size={20}
              color={noneSelected ? colors.onSurfaceVariant : colors.primary}
            />
            <Text style={styles.selectAllText}>
              {allSelected ? S.deselectAll : S.selectAll}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectedCountText}>
            {S.selectedCount(selectedCount, rows.length)}
          </Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ReviewRow
            row={item}
            index={index}
            total={rows.length}
            blocking={
              item.selected &&
              item.status === "done" &&
              item.amount > 0 &&
              item.categoryId === null
            }
            onToggle={() => handleToggle(index)}
            onEditCategory={() => setEditingIdx(index)}
          />
        )}
      />

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.retakeBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.retakeText}>{S.retake}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.confirmBtn,
            (!isReadyToSubmit || isImporting) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmAll}
          disabled={!isReadyToSubmit || isImporting}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.confirmText}>
              {unresolvedCount > 0
                ? S.needCategorize(unresolvedCount)
                : `${S.confirmAll} (${savableRows.length})`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category picker sheet */}
      <CategoryPickerSheet
        visible={editingIdx !== null}
        onClose={() => setEditingIdx(null)}
        title={S.pickCategory}
        entryType="expense"
        selectedCategoryId={editingIdx !== null ? rows[editingIdx]?.categoryId : undefined}
        onSelect={handleCategorySelect}
      />

      {/* Wallet picker sheet */}
      <DraggableSheet
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{S.sheetWallet}</Text>
          <FlatList
            data={basicWallets}
            keyExtractor={(item: Wallet) => item.id}
            style={styles.sheetList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.sheetEmpty}>{S.sheetWalletEmpty}</Text>
            }
            renderItem={({ item }: { item: Wallet }) => (
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
                <Text style={styles.sheetRowText}>
                  {item.name} · {formatVND(item.balance)}
                </Text>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onSurface,
  },

  listContent: {
    padding: SPACING[4],
    gap: SPACING[3],
    paddingBottom: SPACING[4],
  },

  walletFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[3],
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  walletFieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(colors.primary, 0.13),
    flexShrink: 0,
  },
  walletFieldTextWrap: { flex: 1 },
  walletFieldLabel: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  walletFieldValue: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    fontWeight: FONT_WEIGHT.semibold,
  },

  sheet: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
  },
  sheetList: { maxHeight: 380 },
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

  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
  },
  selectAllToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[2],
  },
  selectAllText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  selectedCountText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
  },

  // Review row
  reviewRow: {
    flexDirection: "row",
    gap: SPACING[3],
    backgroundColor: colors.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  reviewRowDeselected: { opacity: 0.5 },
  reviewRowUncertain: { borderColor: withAlpha(colors.secondary, 0.38) },
  reviewRowDuplicate: {
    borderColor: withAlpha(colors.tertiary, 0.31),
    backgroundColor: withAlpha(colors.tertiary, 0.03),
  },
  reviewRowFailed: {
    borderColor: withAlpha(colors.error, 0.25),
    backgroundColor: withAlpha(colors.error, 0.03),
  },
  reviewRowBlocking: { borderColor: withAlpha(colors.error, 0.33) },

  reviewThumbWrap: { position: "relative", width: 64, flexShrink: 0 },
  reviewThumb: {
    width: 64,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surfaceVariant,
  },
  reviewCheckOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: withAlpha(colors.background, 0.8),
    borderRadius: BORDER_RADIUS.full,
  },

  reviewContent: { flex: 1, gap: SPACING[2] },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewImageLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
  },
  reviewBadges: { flexDirection: "row", gap: SPACING[1] },

  uncertainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: withAlpha(colors.secondary, 0.13),
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  uncertainBadgeText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  dupBadge: {
    backgroundColor: withAlpha(colors.tertiary, 0.13),
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  dupBadgeText: {
    fontSize: 10,
    color: colors.tertiary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  reviewField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 20,
  },
  reviewFieldLabel: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  reviewFieldValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
    flex: 2,
    textAlign: "right",
  },
  uncertainLabel: { color: colors.secondary },
  uncertainValue: { color: colors.secondary },
  reviewCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 2,
    justifyContent: "flex-end",
  },
  catDot: { width: 8, height: 8, borderRadius: BORDER_RADIUS.full },
  uncategorizedText: {
    fontSize: FONT_SIZE.xs,
    color: colors.secondary,
    fontStyle: "italic",
  },
  needCategoryText: {
    color: colors.error,
    fontStyle: "normal",
    fontWeight: FONT_WEIGHT.semibold,
  },
  failedText: { fontSize: FONT_SIZE.xs, color: colors.error, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    gap: SPACING[3],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.background,
  },
  retakeBtn: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  retakeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.onPrimary,
  },
  });
}
