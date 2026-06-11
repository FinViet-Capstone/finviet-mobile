import React, { useCallback, useEffect, useState } from "react";
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
import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from "@/constants/theme";
import { MaterialIcon } from "@/components/common/MaterialIcon";
import { DraggableSheet } from "@/components/common/DraggableSheet";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CATEGORIES } from "@/constants/categories";
import { getCategoryIcon } from "@/constants/categoryIcons";
import { formatVND } from "@/utils/formatters";
import { useExtractFromPhoto, useCreateTransaction, useWallets } from "@/hooks";
import { PHOTO_EXTRACTION_CONFIDENCE_THRESHOLD } from "@/constants/extraction";

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: "Xác nhận giao dịch",
  back: "arrow_back",
  processing: "Đang phân tích ảnh...",
  failedExtraction: "Không đọc được ảnh. Vui lòng nhập thủ công.",
  uncertainNotice: "Các trường màu cam cần kiểm tra lại.",
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
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
            color={row.selected ? COLORS.primary : COLORS.onSurfaceVariant}
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
                  color={COLORS.secondary}
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
          <Text style={styles.failedText}>{S.failedExtraction}</Text>
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
                  color={blocking ? COLORS.error : COLORS.onSurfaceVariant}
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
        onError: () => {
          setRows((prev) =>
            prev.map((r, i) =>
              i === idx
                ? { ...r, status: "failed" as const, selected: false }
                : r,
            ),
          );
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
    const wallets = walletsData?.wallets ?? [];
    const primary = wallets.find((w) => w.isPrimary) ?? wallets[0];
    if (!primary) {
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

    setIsImporting(true);
    try {
      for (const row of toSave) {
        await createMutation.mutateAsync({
          walletId: primary.id,
          categoryId: row.categoryId,
          amount: row.amount,
          type: "expense",
          description: row.merchant.trim() || null,
          merchant: row.merchant.trim() || null,
          transactionDate: row.dateIso,
          aiSuggestedCategoryId: row.categoryId,
          aiOverridden: false,
          entryMethod: "photo",
          imageUrl: row.uri,
        });
      }
      Alert.alert("", S.savedMsg(toSave.length), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("", S.saveError);
    } finally {
      setIsImporting(false);
    }
  }, [rows, walletsData, createMutation, router]);

  // Strict gate (Path A): the batch can only be submitted when every selected,
  // successfully-extracted row has a category. Uncategorized selected rows block it.
  const savableRows = rows.filter(
    (r) => r.selected && r.status === "done" && r.amount > 0,
  );
  const unresolvedCount = savableRows.filter(
    (r) => r.categoryId === null,
  ).length;
  const isReadyToSubmit = savableRows.length > 0 && unresolvedCount === 0;

  if (allProcessing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerBtn}
            onPress={() => router.back()}
          >
            <MaterialIcon name={S.back} size={22} color={COLORS.primary} />
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
        >
          <MaterialIcon name={S.back} size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        <View style={styles.headerBtn} />
      </View>

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
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
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
      <DraggableSheet
        visible={editingIdx !== null}
        onClose={() => setEditingIdx(null)}
      >
        <View style={styles.catSheetContent}>
          <Text style={styles.catSheetTitle}>{S.pickCategory}</Text>
          <FlatList
            data={[...CATEGORIES]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected =
                editingIdx !== null && rows[editingIdx]?.categoryId === item.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.catRow, selected && styles.catRowSelected]}
                  onPress={() => handleCategorySelect(item.id)}
                >
                  <View
                    style={[
                      styles.catIconWrap,
                      { backgroundColor: `${item.color}25` },
                    ]}
                  >
                    <MaterialIcon
                      name={getCategoryIcon(item.icon)}
                      size={16}
                      color={item.color}
                    />
                  </View>
                  <Text style={styles.catRowText}>{item.nameVi}</Text>
                  {selected && (
                    <MaterialIcon
                      name="check"
                      size={18}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </DraggableSheet>
    </SafeAreaView>
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
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
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
    color: COLORS.onSurface,
  },

  listContent: {
    padding: SPACING[4],
    gap: SPACING[3],
    paddingBottom: SPACING[4],
  },

  // Review row
  reviewRow: {
    flexDirection: "row",
    gap: SPACING[3],
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  reviewRowDeselected: { opacity: 0.5 },
  reviewRowUncertain: { borderColor: `${COLORS.secondary}60` },
  reviewRowDuplicate: {
    borderColor: `${COLORS.tertiary}50`,
    backgroundColor: `${COLORS.tertiary}08`,
  },
  reviewRowFailed: {
    borderColor: `${COLORS.error}40`,
    backgroundColor: `${COLORS.error}08`,
  },
  reviewRowBlocking: { borderColor: `${COLORS.error}55` },

  reviewThumbWrap: { position: "relative", width: 64, flexShrink: 0 },
  reviewThumb: {
    width: 64,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceVariant,
  },
  reviewCheckOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: `${COLORS.background}CC`,
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
    color: COLORS.onSurfaceVariant,
  },
  reviewBadges: { flexDirection: "row", gap: SPACING[1] },

  uncertainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${COLORS.secondary}20`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  uncertainBadgeText: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  dupBadge: {
    backgroundColor: `${COLORS.tertiary}20`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  dupBadgeText: {
    fontSize: 10,
    color: COLORS.tertiary,
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
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  reviewFieldValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    flex: 2,
    textAlign: "right",
  },
  uncertainLabel: { color: COLORS.secondary },
  uncertainValue: { color: COLORS.secondary },
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
    color: COLORS.secondary,
    fontStyle: "italic",
  },
  needCategoryText: {
    color: COLORS.error,
    fontStyle: "normal",
    fontWeight: FONT_WEIGHT.semibold,
  },
  failedText: { fontSize: FONT_SIZE.xs, color: COLORS.error, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    gap: SPACING[3],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.background,
  },
  retakeBtn: {
    flex: 1,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  retakeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onPrimary,
  },

  // Category sheet
  catSheetContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[8],
    maxHeight: "70%",
  },
  catSheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[3],
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  catRowSelected: {
    backgroundColor: `${COLORS.primaryContainer}22`,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[2],
    borderBottomWidth: 0,
    marginVertical: SPACING[1],
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  catRowText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.onSurface },
});
