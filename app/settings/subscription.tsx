import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isAxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { newIdempotencyKey } from '@/lib/idempotency';
import { getApiErrorMessage } from '@/utils/errors';
import { getCurrentSubscription, getSubscriptionPayment, getSubscriptionPlans, isVNPayUrl, subscribeToPlan, subscriptionReturnUrl, type CheckoutAttempt } from '@/services/real/subscriptions';

const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export default function SubscriptionScreen() {
  const customer = useAuthStore(s => s.customer);
  if (!customer) return <Redirect href="/" />;
  return <CustomerSubscription key={customer.id} customerId={customer.id} />;
}

function CustomerSubscription({ customerId }: { customerId: string }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const router = useRouter();
  const focused = useIsFocused();
  const client = useQueryClient();
  const storageKey = `subscription.${customerId}`;
  const attemptKey = ['subscription', customerId, 'attempt'];
  const [appState, setAppState] = useState(AppState.currentState);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = focused && appState === 'active';
  const stored = useQuery({
    queryKey: attemptKey,
    queryFn: async (): Promise<CheckoutAttempt | null> => {
      const raw = await SecureStore.getItemAsync(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, staleTime: Infinity, retry: false,
  });
  const attempt = stored.data;
  const checkout = attempt?.checkout;
  const plans = useQuery({ queryKey: ['subscription', customerId, 'plans'], queryFn: getSubscriptionPlans, enabled: active });
  const current = useQuery({ queryKey: ['subscription', customerId, 'current'], queryFn: getCurrentSubscription, enabled: active });
  const expired = !!checkout && Date.parse(checkout.expiresAt) <= now;
  const payment = useQuery({
    queryKey: ['subscription', customerId, 'payment', checkout?.paymentId],
    queryFn: () => getSubscriptionPayment(checkout!.paymentId), enabled: active && !!checkout,
    retry: false,
    refetchInterval: query => active && !expired && (!query.state.data || query.state.data.status === 'pending') ? 3000 : false,
  });
  const status = payment.data?.status;
  useEffect(() => {
    const listener = AppState.addEventListener('change', setAppState);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (status === 'succeeded') void client.invalidateQueries({ queryKey: ['subscription', customerId, 'current'] });
  }, [status, client, customerId]);

  async function save(value: CheckoutAttempt | null) {
    if (value) await SecureStore.setItemAsync(storageKey, JSON.stringify(value));
    else await SecureStore.deleteItemAsync(storageKey);
    client.setQueryData(attemptKey, value);
  }
  async function purchase(planId: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const next = attempt?.planId === planId ? attempt : { planId, key: newIdempotencyKey(), returnUrl: subscriptionReturnUrl() };
      await save(next);
      const result = await subscribeToPlan(next);
      await save({ ...next, checkout: result });
    } catch (e) {
      if (isAxiosError(e) && [400, 404, 422].includes(e.response?.status ?? 0)) {
        await save(null).catch(() => undefined);
        void current.refetch();
      }
      setError(getApiErrorMessage(e, 'Chưa thể tạo thanh toán. Vui lòng thử lại cùng giao dịch.'));
    }
    finally { lock.current = false; setBusy(false); }
  }
  async function openPayment() {
    if (!checkout || Date.parse(checkout.expiresAt) <= Date.now()) return;
    if (!isVNPayUrl(checkout.redirectUrl)) { setError('Địa chỉ thanh toán không hợp lệ. Vui lòng liên hệ hỗ trợ.'); return; }
    try { await Linking.openURL(checkout.redirectUrl); }
    catch { setError('Không thể mở VNPay. Vui lòng thử lại.'); }
  }
  async function clearAttempt() {
    try { await save(null); setError(''); }
    catch { setError('Không thể lưu thay đổi. Vui lòng thử lại.'); }
  }
  async function startAgain() {
    const result = await payment.refetch();
    if (result.error || !result.data) { setError('Chưa thể kiểm tra giao dịch. Vui lòng thử lại.'); return; }
    if (result.data.status === 'succeeded') return;
    Alert.alert('Bạn chưa thanh toán?', 'Nếu tài khoản ngân hàng đã bị trừ tiền, hãy chờ xác nhận hoặc liên hệ hỗ trợ. Chỉ tạo giao dịch mới khi bạn chưa thanh toán.', [
      { text: 'Tiếp tục chờ', style: 'cancel' },
      { text: 'Tôi chưa thanh toán', onPress: () => void clearAttempt() },
    ]);
  }
  const blocked = busy || stored.isPending || stored.isError || !!attempt || current.isPending || current.isError || !!current.data || status === 'succeeded';
  const seconds = checkout ? Math.max(0, Math.ceil((Date.parse(checkout.expiresAt) - now) / 1000)) : 0;
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back}><MaterialIcon name="arrow_back" size={24} color={colors.onSurface} /></TouchableOpacity>
      <Text style={styles.headerTitle}>Gói đăng ký</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><MaterialIcon name="workspace_premium" size={42} color={colors.primary} /><Text style={styles.title}>FinViet Premium</Text><Text style={styles.description}>Chọn gói phù hợp với bạn.{"\n"}Thanh toán an toàn bằng VNPay QR.</Text></View>
      {current.data && <View style={styles.card}><Text style={styles.cardTitle}>{current.data.planName}</Text><Text style={styles.body}>{current.data.status === 'active' ? 'Gói đang hoạt động' : 'Đang chờ xử lý gia hạn'} · {money(current.data.lockedPrice)}</Text>{current.data.nextBillingDate && <Text style={styles.body}>Kỳ thanh toán tiếp theo: {new Date(`${current.data.nextBillingDate}T00:00:00`).toLocaleDateString('vi-VN')}</Text>}</View>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {(plans.isError || current.isError || stored.isError) && <View style={styles.card}><Text style={styles.error}>Không thể tải thông tin gói hoặc giao dịch.</Text><TouchableOpacity style={styles.secondary} onPress={() => { void plans.refetch(); void current.refetch(); void stored.refetch(); }}><Text style={styles.secondaryText}>Thử lại</Text></TouchableOpacity></View>}
      {attempt && !checkout && <View style={styles.card}><Text style={styles.cardTitle}>Giao dịch chưa được xác nhận</Text><Text style={styles.body}>Nếu kết nối bị gián đoạn, hãy tiếp tục cùng giao dịch để tránh tạo thanh toán trùng.</Text><TouchableOpacity style={styles.primary} disabled={busy} onPress={() => purchase(attempt.planId)}><Text style={styles.primaryText}>{busy ? 'Đang xử lý…' : 'Tiếp tục giao dịch'}</Text></TouchableOpacity></View>}
      {checkout && <View style={styles.card} accessibilityLiveRegion="polite">
        <MaterialIcon name={status === 'succeeded' ? 'check_circle' : 'qr_code_2'} size={38} color={colors.primary} />
        <Text style={styles.cardTitle}>{status === 'succeeded' ? 'Thanh toán thành công' : status === 'failed' || status === 'canceled' ? 'Thanh toán chưa thành công' : 'Thanh toán VNPay QR'}</Text>
        <Text style={styles.price}>{money(checkout.amount)}</Text>
        {status === 'succeeded' ? <Text style={styles.body}>Gói đăng ký đã được kích hoạt.</Text> : status === 'failed' || status === 'canceled' ? <><Text style={styles.body}>Giao dịch đã được xác nhận {status === 'canceled' ? 'hủy' : 'không thành công'}. Bạn có thể chọn lại gói.</Text><TouchableOpacity style={styles.secondary} onPress={clearAttempt}><Text style={styles.secondaryText}>Chọn lại gói</Text></TouchableOpacity></> : <>
          <Text style={styles.body}>{expired ? 'Liên kết đã hết hạn. Nếu đã thanh toán, hãy kiểm tra kết quả trước khi tạo giao dịch khác.' : `Còn ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} để thanh toán.`}</Text>
          {!expired && <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={openPayment}><Text style={styles.primaryText}>Mở mã QR trên VNPay</Text></TouchableOpacity>}
          <Text style={styles.body}>Trang VNPay sẽ hiển thị mã QR. Dùng ứng dụng ngân hàng trên thiết bị khác để quét, hoặc làm theo hướng dẫn thanh toán trên VNPay. Sau đó quay lại FinViet.</Text>
          <TouchableOpacity style={styles.secondary} disabled={payment.isFetching} onPress={() => void payment.refetch()}><Text style={styles.secondaryText}>{payment.isFetching ? 'Đang kiểm tra…' : 'Tôi đã thanh toán · Kiểm tra kết quả'}</Text></TouchableOpacity>
          <Text style={styles.body}>{payment.isError ? 'Chưa thể kiểm tra kết quả. Vui lòng thử lại, không thanh toán lần nữa.' : 'Đang chờ VNPay xác nhận. Đóng trình duyệt không đồng nghĩa với hủy thanh toán.'}</Text>
          {expired && <TouchableOpacity style={styles.secondary} disabled={payment.isFetching} onPress={() => void startAgain()}><Text style={styles.secondaryText}>Chưa thanh toán · Chọn lại gói</Text></TouchableOpacity>}
        </>}
        <Text selectable style={styles.caption}>Mã giao dịch: {checkout.paymentId}</Text>
      </View>}
      {(plans.isPending || stored.isPending) && <ActivityIndicator color={colors.primary} />}
      {plans.data?.length === 0 && <Text style={styles.body}>Chưa có gói nào được mở bán. Vui lòng quay lại sau.</Text>}
      {plans.data?.map(plan => <View key={plan.planId} style={styles.card}>
        <Text style={styles.cardTitle}>{plan.name}</Text><Text style={styles.price}>{money(plan.price)}</Text><Text style={styles.body}>/ {plan.billingIntervalMonths} tháng</Text>
        {plan.features.map((feature, index) => <View style={styles.feature} key={index}><MaterialIcon name="check" size={20} color={colors.primary} /><Text style={[styles.body, styles.featureText]}>{feature}</Text></View>)}
        <TouchableOpacity accessibilityRole="button" disabled={blocked || plan.price <= 0} style={[styles.primary, (blocked || plan.price <= 0) && styles.disabled]} onPress={() => purchase(plan.planId)}><Text style={styles.primaryText}>{current.data?.planId === plan.planId ? 'Gói hiện tại' : plan.price <= 0 ? 'Gói miễn phí' : 'Chọn gói · VNPay QR'}</Text></TouchableOpacity>
      </View>)}
      <Text style={styles.caption}>Giá niêm yết bằng Việt Nam đồng. Gói chỉ được kích hoạt sau khi VNPay xác nhận thanh toán.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, paddingVertical: 8 },
  back: { padding: 12 }, headerTitle: { color: c.onSurface, fontSize: 20, fontWeight: '700' },
  content: { padding: 20, gap: 18, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  title: { fontSize: 30, fontWeight: '800', color: c.onSurface },
  description: { color: c.onSurfaceVariant, fontSize: 16, lineHeight: 25, textAlign: 'center' },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.outlineVariant, borderRadius: 22, padding: 22, gap: 12 },
  cardTitle: { color: c.onSurface, fontSize: 21, fontWeight: '700' },
  price: { color: c.primary, fontSize: 30, fontWeight: '800' },
  body: { color: c.onSurfaceVariant, fontSize: 14, lineHeight: 23 },
  feature: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, featureText: { flex: 1 },
  primary: { backgroundColor: c.primary, padding: 15, borderRadius: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryText: { color: c.onPrimary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondary: { borderWidth: 1, borderColor: c.outlineVariant, padding: 14, borderRadius: 13, minHeight: 48, justifyContent: 'center' },
  secondaryText: { color: c.primary, fontWeight: '600', textAlign: 'center' }, disabled: { opacity: 0.45 },
  caption: { color: c.onSurfaceVariant, fontSize: 12, lineHeight: 20 },
  error: { color: c.error, fontSize: 14, lineHeight: 22 },
});
