import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isAxiosError } from "axios";
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
import { DatePickerField } from "@/components/common/DatePickerField";
import { TextInput } from "@/components/common/TextInput";
import { ImagePreviewModal } from "@/components/common/ImagePreviewModal";
import { formatVND } from "@/utils/formatters";
import { useExtractFromPhoto, useCreateTransaction, useWallets } from "@/hooks";
import type { Wallet } from "@/types/wallet";
import { PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD } from "@/constants/extraction";
import { getApiErrorMessage } from "@/utils/errors";
import { isValidReceiptDate, parseReceiptAmount } from "@/utils/receiptReview";
import { saveReceiptImage } from "@/lib/receiptImageStorage";

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
  reviewHint:
    "Đây là kết quả AI đề xuất. Hãy chạm vào từng trường để kiểm tra và chỉnh sửa trước khi lưu.",
  selectAll: "Chọn tất cả",
  deselectAll: "Bỏ chọn tất cả",
  selectedCount: (selected: number, total: number) => `${selected}/${total} đã chọn`,
  confirmAll: "Lưu sau khi kiểm tra",
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
  savedTitle: "Đã lưu thành công",
  savedMsg: (n: number, dateIso?: string) =>
    n === 1 && dateIso
      ? `Giao dịch đã được lưu vào ngày ${formatDate(dateIso)}. Mở chi tiết để kiểm tra ngay.`
      : `Đã lưu ${n} giao dịch.`,
  viewSaved: "Xem giao dịch",
  saveError: "Không lưu được. Hãy thử lại.",
  imageOf: (i: number, n: number) => `Ảnh ${i}/${n}`,
  previewImage: "Mở ảnh hóa đơn toàn màn hình",
  imageSaveWarning:
    "\n\nẢnh hóa đơn chưa được lưu trên thiết bị, nhưng giao dịch đã được tạo.",
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
  dateUncertain: boolean;
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
  return isAxiosError(err) && err.response?.data?.code === "ocr_not_configured";
}

function isUncertain(row: ExtractedRow): boolean {
  return (
    row.amountUncertain ||
    row.merchantUncertain ||
    row.categoryUncertain ||
    row.dateUncertain
  );
}

// ─── Review Row ───────────────────────────────────────────────────────────────

function ReviewRow({
  row,
  index,
  total,
  blocking,
  onToggle,
  onPreviewImage,
  onEditAmount,
  onEditMerchant,
  onEditDate,
  onEditCategory,
}: {
  row: ExtractedRow;
  index: number;
  total: number;
  /** Selected + extracted but has no category → blocks the batch submit. */
  blocking: boolean;
  onToggle: () => void;
  onPreviewImage: () => void;
  onEditAmount: (amount: number) => void;
  onEditMerchant: (merchant: string) => void;
  onEditDate: (dateIso: string) => void;
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
    <View
      style={[
        styles.reviewRow,
        !row.selected && styles.reviewRowDeselected,
        uncertain && styles.reviewRowUncertain,
        row.isDuplicate && styles.reviewRowDuplicate,
        isFailed && styles.reviewRowFailed,
        blocking && styles.reviewRowBlocking,
      ]}
    >
      {/* Thumbnail + checkbox */}
      <View style={styles.reviewThumbWrap}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPreviewImage}
          accessibilityRole="imagebutton"
          accessibilityLabel={S.previewImage}
        >
          <Image
            source={{ uri: row.uri }}
            style={styles.reviewThumb}
            resizeMode="cover"
          />
          <View style={styles.reviewZoomOverlay} pointerEvents="none">
            <MaterialIcon name="zoom_in" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reviewCheckOverlay}
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: row.selected }}
          accessibilityLabel={`${row.selected ? "Bỏ chọn" : "Chọn"} ảnh ${index + 1}`}
        >
          <MaterialIcon
            name={row.selected ? "check_circle" : "radio_button_unchecked"}
            size={20}
            color={row.selected ? colors.primary : colors.onSurfaceVariant}
          />
        </TouchableOpacity>
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
              <View style={styles.reviewEditableValue}>
                <TextInput
                  variant="bare"
                  value={row.amount > 0 ? String(row.amount) : ""}
                  onChangeText={(value) => onEditAmount(parseReceiptAmount(value))}
                  keyboardType="number-pad"
                  placeholder="Nhập số tiền"
                  accessibilityLabel={`Số tiền ảnh ${index + 1}`}
                  inputStyle={[
                    styles.reviewEditableInput,
                    row.amountUncertain && styles.uncertainValue,
                  ]}
                />
                <Text style={styles.currencySuffix}>đ</Text>
                <MaterialIcon name="edit" size={14} color={colors.primary} />
              </View>
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
              <View style={styles.reviewEditableValue}>
                <TextInput
                  variant="bare"
                  value={row.merchant}
                  onChangeText={onEditMerchant}
                  placeholder="Nhập người nhận"
                  accessibilityLabel={`Người nhận ảnh ${index + 1}`}
                  inputStyle={[
                    styles.reviewEditableInput,
                    row.merchantUncertain && styles.uncertainValue,
                  ]}
                />
                <MaterialIcon name="edit" size={14} color={colors.primary} />
              </View>
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
            <DatePickerField
              value={row.dateIso}
              onChange={onEditDate}
              maxDate={todayISO()}
              uncertain={row.dateUncertain}
              customTrigger={(openPicker) => (
                <TouchableOpacity style={styles.reviewField} onPress={openPicker}>
                  <Text
                    style={[
                      styles.reviewFieldLabel,
                      row.dateUncertain && styles.uncertainLabel,
                    ]}
                  >
                    {S.dateLabel}
                  </Text>
                  <View style={styles.reviewEditableValue}>
                    <Text
                      style={[
                        styles.reviewFieldValue,
                        row.dateUncertain && styles.uncertainValue,
                      ]}
                    >
                      {formatDate(row.dateIso)}
                    </Text>
                    <MaterialIcon name="edit_calendar" size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </View>
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
      dateUncertain: false,
      selected: true,
      isDuplicate: false,
    })),
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const ocrUnavailableAlertShown = useRef(false);

  // Photo entries can only target basic wallets — bank-linked wallets are
  // read-only (their transactions come from provider sync).
  const basicWallets = (walletsData?.wallets ?? []).filter((w) => w.type !== "linked");
  const effectiveSelectedWalletId = selectedWalletId ?? basicWallets[0]?.id ?? null;
  const selectedWallet =
    basicWallets.find((w) => w.id === effectiveSelectedWalletId) ?? basicWallets[0];

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
                    dateUncertain:
                      result.confidence.transactionDate <
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

  const handleAmountEdit = useCallback((idx: number, amount: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, amount, amountUncertain: false } : row,
      ),
    );
  }, []);

  const handleMerchantEdit = useCallback((idx: number, merchant: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, merchant, merchantUncertain: false } : row,
      ),
    );
  }, []);

  const handleDateEdit = useCallback((idx: number, dateIso: string) => {
    if (!isValidReceiptDate(dateIso, todayISO())) return;
    setRows((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, dateIso, dateUncertain: false } : row,
      ),
    );
  }, []);

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
      const createdTransactions = [];
      let imageSaveFailed = false;
      for (const row of toSave) {
        const created = await createMutation.mutateAsync({
          walletId: selectedWallet.id,
          categoryId: row.categoryId,
          amount: row.amount,
          type: "expense",
          description: row.merchant.trim() || null,
          merchant: row.merchant.trim() || null,
          transactionDate: row.dateIso,
          entryMethod: "photo",
        });
        try {
          saveReceiptImage(created.id, row.uri);
        } catch {
          // The transaction is already committed server-side. Keep it and tell
          // the user only that its local image copy could not be preserved.
          imageSaveFailed = true;
        }
        createdTransactions.push(created);
      }
      const firstCreated = createdTransactions[0];
      const savedMessage =
        S.savedMsg(toSave.length, toSave[0]?.dateIso) +
        (imageSaveFailed ? S.imageSaveWarning : "");
      Alert.alert(S.savedTitle, savedMessage, [
        {
          text: S.viewSaved,
          onPress: () =>
            firstCreated && createdTransactions.length === 1
              ? router.replace({
                  pathname: "/(tabs)/transactions/[id]",
                  params: { id: firstCreated.id, returnTo: "history" },
                })
              : router.replace("/(tabs)/transactions"),
        },
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

      <View style={styles.reviewNotice}>
        <MaterialIcon name="fact_check" size={18} color={colors.primary} />
        <Text style={styles.reviewNoticeText}>{S.reviewHint}</Text>
      </View>

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
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
            onPreviewImage={() => setPreviewUri(item.uri)}
            onEditAmount={(amount) => handleAmountEdit(index, amount)}
            onEditMerchant={(merchant) => handleMerchantEdit(index, merchant)}
            onEditDate={(dateIso) => handleDateEdit(index, dateIso)}
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
                  effectiveSelectedWalletId === item.id && styles.sheetRowSelected,
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
                {effectiveSelectedWalletId === item.id && (
                  <MaterialIcon name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </DraggableSheet>

      {previewUri ? (
        <ImagePreviewModal
          visible
          uri={previewUri}
          title="Ảnh hóa đơn gốc"
          onClose={() => setPreviewUri(null)}
        />
      ) : null}
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

  reviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING[2],
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: withAlpha(colors.primary, 0.08),
  },
  reviewNoticeText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
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
  reviewZoomOverlay: {
    position: "absolute",
    left: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#000000", 0.58),
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
    minHeight: 30,
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
  reviewEditableValue: {
    flex: 2,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  reviewEditableInput: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: "right",
    color: colors.onSurface,
  },
  currencySuffix: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
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
