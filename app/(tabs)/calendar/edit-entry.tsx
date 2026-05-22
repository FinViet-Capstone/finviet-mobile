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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import {
  useTransactionById,
  useTransactions,
  useWallets,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/hooks';
import { CATEGORIES } from '@/constants/categories';
import type { Category } from '@/constants/categories';
import { formatVND } from '@/utils/formatters';
import type { Wallet } from '@/types/wallet';

export default function EditEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; uncategorized?: string }>();

  // Mode A: list of uncategorized entries (when ?uncategorized=1)
  const isFixUncategorized = params.uncategorized === '1';

  if (isFixUncategorized) return <UncategorizedListMode />;
  if (!params.id) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Sửa giao dịch" />
        <EmptyState
          iconName="alert-circle-outline"
          title="Thiếu mã giao dịch"
          subtitle="Không thể tải giao dịch này. Quay lại và thử lại."
        />
      </SafeAreaView>
    );
  }

  return <EditMode txId={params.id} />;
}

// ───────────────────────────────────────────────────────────────────────────
// Mode A — list all uncategorized entries
// ───────────────────────────────────────────────────────────────────────────

function UncategorizedListMode() {
  const router = useRouter();
  const { data, isLoading } = useTransactions({ uncategorizedOnly: true });

  if (isLoading) return <LoadingSpinner />;

  const list = (data ?? []).filter((t) => t.type === 'expense');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title="Cần phân loại" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {list.length} giao dịch chưa được phân loại. Chạm vào một mục để chỉnh sửa.
        </Text>

        {list.length === 0 ? (
          <EmptyState
            iconName="checkmark-circle-outline"
            title="Tất cả đã phân loại"
            subtitle="Tất cả giao dịch của bạn đều đã có danh mục."
          />
        ) : (
          list.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              onPress={() =>
                router.push(
                  `/(tabs)/calendar/edit-entry?id=${tx.id}` as never,
                )
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Mode B — edit a specific transaction
// ───────────────────────────────────────────────────────────────────────────

function EditMode({ txId }: { txId: string }) {
  const router = useRouter();
  const { data: tx, isLoading } = useTransactionById(txId);
  const { data: walletData } = useWallets();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const [amountRaw, setAmountRaw] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [amountError, setAmountError] = useState<string | undefined>();

  useEffect(() => {
    if (!tx) return;
    setAmountRaw(String(tx.amount));
    setDescription(tx.description ?? '');
    setMerchant(tx.merchant ?? '');
    setCategoryId(tx.categoryId);
    setWalletId(tx.walletId);
  }, [tx]);

  if (isLoading) return <LoadingSpinner />;
  if (!tx) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Không tìm thấy" />
        <EmptyState
          iconName="receipt-outline"
          title="Không tìm thấy giao dịch"
          subtitle="Giao dịch này có thể đã bị xóa."
        />
      </SafeAreaView>
    );
  }

  const wallets: Wallet[] = walletData?.wallets ?? [];
  const selectedCategory: Category | null = categoryId
    ? CATEGORIES.find((c) => c.id === categoryId) ?? null
    : null;
  const selectedWallet =
    wallets.find((w) => w.id === walletId) ?? null;

  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';

  const [yyyy, mm, dd] = tx.transactionDate.split('-');
  const dateDisplay = `${dd}/${mm}/${yyyy}`;

  const handleSave = () => {
    setAmountError(undefined);
    const amount = parseInt(amountRaw, 10) || 0;
    if (amount <= 0) {
      setAmountError('Số tiền phải lớn hơn 0');
      return;
    }
    if (!walletId) {
      Alert.alert('Chưa chọn ví', 'Hãy chọn ví trước khi lưu.');
      return;
    }
    updateMutation.mutate(
      {
        id: txId,
        patch: {
          amount,
          description: description.trim() || null,
          merchant: isTransfer ? null : (merchant.trim() || null),
          categoryId: isTransfer ? null : categoryId,
          walletId: isTransfer ? undefined : walletId,
        },
      },
      {
        onSuccess: () =>
          Alert.alert('Đã lưu', 'Giao dịch đã được cập nhật.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: () => Alert.alert('Lỗi', 'Không cập nhật được giao dịch.'),
      },
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa giao dịch?',
      isTransfer
        ? 'Đây là giao dịch chuyển khoản. Cả hai chiều (nhận + chuyển) sẽ bị xóa.'
        : 'Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            deleteMutation.mutate(txId, {
              onSuccess: () =>
                Alert.alert('Đã xóa', 'Giao dịch đã được xóa.', [
                  { text: 'OK', onPress: () => router.back() },
                ]),
              onError: () => Alert.alert('Lỗi', 'Không xóa được giao dịch.'),
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => router.back()} title="Sửa giao dịch" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isTransfer ? (
            <View style={styles.transferBanner}>
              <Text style={styles.transferBannerText}>
                Đây là giao dịch chuyển khoản. Một số trường không thể chỉnh sửa.
              </Text>
            </View>
          ) : null}

          {/* Amount */}
          <View style={styles.card}>
            <TextInput
              label="Số tiền"
              value={amountRaw}
              onChangeText={(t) => {
                setAmountRaw(t.replace(/\D/g, ''));
                if (amountError) setAmountError(undefined);
              }}
              keyboardType="numeric"
              placeholder="0"
              error={amountError}
              editable={!isTransfer}
            />
            <Text style={styles.amountPreview}>
              {formatVND(parseInt(amountRaw, 10) || 0)}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <TextInput
              label="Mô tả"
              value={description}
              onChangeText={setDescription}
              placeholder="VD: Cà phê sáng"
            />
          </View>

          {/* Merchant */}
          {!isTransfer ? (
            <View style={styles.card}>
              <TextInput
                label="Nơi bán (tùy chọn)"
                value={merchant}
                onChangeText={setMerchant}
                placeholder="VD: Highlands Coffee"
              />
            </View>
          ) : null}

          {/* Category (skip for transfers) */}
          {!isTransfer ? (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Danh mục</Text>
              <TouchableOpacity
                style={[
                  styles.selectRow,
                  categoryId === null && styles.selectRowUncategorized,
                ]}
                onPress={() => setShowCategoryModal(true)}
                activeOpacity={0.75}
              >
                {selectedCategory ? (
                  <View style={styles.selectRowLeft}>
                    <View
                      style={[styles.dot, { backgroundColor: selectedCategory.color }]}
                    />
                    <Text style={styles.selectValue}>{selectedCategory.nameVi}</Text>
                  </View>
                ) : (
                  <Text style={styles.selectPlaceholder}>
                    ? Chưa phân loại — chạm để chọn
                  </Text>
                )}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Wallet */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ví</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setShowWalletModal(true)}
              activeOpacity={0.75}
              disabled={isTransfer}
            >
              <Text style={styles.selectValue}>
                {selectedWallet?.name ?? 'Không xác định'}
              </Text>
              {!isTransfer ? <Text style={styles.chevron}>›</Text> : null}
            </TouchableOpacity>
          </View>

          {/* Date (read-only for now — date picker is a future iteration) */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ngày</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() =>
                Alert.alert('Chọn ngày', 'Tính năng chọn ngày sẽ sớm ra mắt.')
              }
              activeOpacity={0.75}
            >
              <Text style={styles.selectValue}>{dateDisplay}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Lưu thay đổi"
            onPress={handleSave}
            loading={updateMutation.isPending}
            style={styles.submit}
          />

          <Button
            title="Xóa giao dịch"
            variant="ghost"
            onPress={handleDelete}
            loading={deleteMutation.isPending}
          />
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
                    {item.type === 'cash' ? '💵' : item.type === 'momo' ? '📱' : '🏦'}
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
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    lineHeight: 20,
    marginBottom: SPACING[3],
  },

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

  transferBanner: {
    backgroundColor: COLORS.brand[50],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand[500],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  transferBannerText: { fontSize: FONT_SIZE.sm, color: COLORS.gray[700], lineHeight: 20 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  amountPreview: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    textAlign: 'right',
    marginTop: SPACING[2],
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
  selectRowUncategorized: {
    borderColor: COLORS.calendar.uncategorized,
    borderWidth: 2,
  },
  selectRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectValue: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.gray[900] },
  selectPlaceholder: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.calendar.uncategorized,
    fontWeight: FONT_WEIGHT.medium,
  },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.gray[400],
    marginLeft: SPACING[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING[2],
  },

  submit: { marginTop: SPACING[2], marginBottom: SPACING[2] },

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
  dotMd: {
    width: 14,
    height: 14,
    borderRadius: BORDER_RADIUS.full,
  },
  checkmark: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
  },
  walletEmoji: { fontSize: 22 },
});
