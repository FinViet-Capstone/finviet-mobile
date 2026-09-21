import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isAxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { newIdempotencyKey } from '@/lib/idempotency';
import { getApiErrorMessage } from '@/utils/errors';
import {
  createPaymentOrder,
  getCurrentSubscription,
  getPaymentStatus,
  getSubscriptionPlans,
  type CheckoutAttempt,
} from '@/services/real/subscriptions';

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
  const storageKey = `subscription.payos.${customerId}`;
  const attemptKey = ['subscription', customerId, 'attempt'];
  const [appState, setAppState] = useState(AppState.currentState);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const prevAppState = useRef(appState);
  const active = focused && appState === 'active';

  const stored = useQuery({
    queryKey: attemptKey,
    queryFn: async (): Promise<CheckoutAttempt | null> => {
      const raw = await SecureStore.getItemAsync(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, staleTime: Infinity, retry: false,
  });
  const attempt = stored.data;
  const order = attempt?.order;
  const plans = useQuery({ queryKey: ['subscription', customerId, 'plans'], queryFn: getSubscriptionPlans, enabled: active });
  const current = useQuery({ queryKey: ['subscription', customerId, 'current'], queryFn: getCurrentSubscription, enabled: active });
  const expired = !!order && Date.parse(order.expiresAt) <= now;

  const payment = useQuery({
    queryKey: ['subscription', customerId, 'payment', order?.orderCode],
    queryFn: () => getPaymentStatus(order!.orderCode),
    enabled: active && !!order,
    retry: false,
    refetchInterval: query => active && !expired && (!query.state.data || query.state.data.status === 'pending') ? 3000 : false,
  });
  const status = payment.data?.status;

  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => {
      if (prevAppState.current !== 'active' && next === 'active' && order) {
        void payment.refetch();
      }
      prevAppState.current = next;
      setAppState(next);
    });
    return () => listener.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

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
      const next: CheckoutAttempt = attempt?.planId === planId && attempt.key
        ? attempt
        : { planId, key: newIdempotencyKey() };
      await save(next);
      const result = await createPaymentOrder(next.planId, next.key);
      await save({ ...next, order: result });
    } catch (e) {
      if (isAxiosError(e) && [400, 404, 422].includes(e.response?.status ?? 0)) {
        await save(null).catch(() => undefined);
        void current.refetch();
      }
      setError(getApiErrorMessage(e, 'Chua the tao thanh toan. Vui long thu lai.'));
    } finally { lock.current = false; setBusy(false); }
  }

  async function clearAttempt() {
    try { await save(null); setError(''); }
    catch { setError('Khong the luu thay doi. Vui long thu lai.'); }
  }

  async function startAgain() {
    const result = await payment.refetch();
    if (result.error || !result.data) { setError('Chua the kiem tra giao dich. Vui long thu lai.'); return; }
    if (result.data.status === 'succeeded') return;
    Alert.alert('Ban chua thanh toan?', 'Neu tai khoan ngan hang da bi tru tien, hay cho xac nhan hoac lien he ho tro. Chi tao giao dich moi khi ban chua thanh toan.', [
      { text: 'Tiep tuc cho', style: 'cancel' },
      { text: 'Toi chua thanh toan', onPress: () => void clearAttempt() },
    ]);
  }

  const blocked = busy || stored.isPending || stored.isError || !!attempt || current.isPending || current.isError || !!current.data || status === 'succeeded';
  const seconds = order ? Math.max(0, Math.ceil((Date.parse(order.expiresAt) - now) / 1000)) : 0;

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lai" onPress={() => router.back()} style={styles.back}>
        <MaterialIcon name="arrow_back" size={24} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Goi dang ky</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <MaterialIcon name="workspace_premium" size={42} color={colors.primary} />
        <Text style={styles.title}>FinViet Premium</Text>
        <Text style={styles.description}>Chon goi phu hop voi ban.{"\n"}Thanh toan nhanh bang ma QR ngan hang.</Text>
      </View>

      {current.data && <View style={styles.card}>
        <Text style={styles.cardTitle}>{current.data.planName}</Text>
        <Text style={styles.body}>
          {current.data.status === 'active' ? 'Goi dang hoat dong' : 'Dang cho xu ly'} - {money(current.data.lockedPrice)}
        </Text>
        {current.data.expiresAt && <Text style={styles.body}>
          Het han: {new Date(current.data.expiresAt).toLocaleDateString('vi-VN')}
        </Text>}
      </View>}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      {(plans.isError || current.isError || stored.isError) && <View style={styles.card}>
        <Text style={styles.error}>Khong the tai thong tin goi hoac giao dich.</Text>
        <TouchableOpacity style={styles.secondary} onPress={() => { void plans.refetch(); void current.refetch(); void stored.refetch(); }}>
          <Text style={styles.secondaryText}>Thu lai</Text>
        </TouchableOpacity>
      </View>}

      {attempt && !order && <View style={styles.card}>
        <Text style={styles.cardTitle}>Giao dich chua duoc xac nhan</Text>
        <Text style={styles.body}>Neu ket noi bi gian doan, hay tiep tuc cung giao dich de tranh tao thanh toan trung.</Text>
        <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => purchase(attempt.planId)}>
          <Text style={styles.primaryText}>{busy ? 'Dang xu ly...' : 'Tiep tuc giao dich'}</Text>
        </TouchableOpacity>
      </View>}

      {order && <View style={styles.card} accessibilityLiveRegion="polite">
        {status === 'succeeded' ? <>
          <MaterialIcon name="check_circle" size={38} color={colors.success ?? colors.primary} />
          <Text style={styles.cardTitle}>Thanh toan thanh cong</Text>
          <Text style={styles.price}>{money(order.amount)}</Text>
          <Text style={styles.body}>Goi dang ky da duoc kich hoat.</Text>
        </> : status === 'failed' || status === 'expired' ? <>
          <MaterialIcon name="error" size={38} color={colors.error} />
          <Text style={styles.cardTitle}>Thanh toan khong thanh cong</Text>
          <Text style={styles.price}>{money(order.amount)}</Text>
          <Text style={styles.body}>Giao dich da duoc xac nhan {status === 'expired' ? 'het han' : 'khong thanh cong'}. Ban co the chon lai goi.</Text>
          <TouchableOpacity style={styles.secondary} onPress={clearAttempt}>
            <Text style={styles.secondaryText}>Chon lai goi</Text>
          </TouchableOpacity>
        </> : <>
          <Text style={styles.cardTitle}>Quet ma QR de thanh toan</Text>
          <Text style={styles.price}>{money(order.amount)}</Text>
          <Text style={styles.body}>
            {expired
              ? 'Ma QR da het han. Neu da thanh toan, hay kiem tra ket qua truoc khi tao giao dich khac.'
              : `Con ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} de thanh toan.`}
          </Text>
          {!expired && <View style={styles.qrContainer}>
            <QRCode value={order.qrCode} size={220} backgroundColor="white" />
          </View>}
          <Text style={styles.body}>Mo ung dung ngan hang, chon chuyen khoan bang ma QR, quet ma nay va xac nhan thanh toan. Sau do quay lai FinViet.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.secondary}
            disabled={payment.isFetching}
            onPress={() => void payment.refetch()}
          >
            <Text style={styles.secondaryText}>
              {payment.isFetching ? 'Dang kiem tra...' : 'Kiem tra thanh toan'}
            </Text>
          </TouchableOpacity>
          {payment.isError && <Text style={styles.body}>Chua the kiem tra ket qua. Vui long thu lai, khong thanh toan lan nua.</Text>}
          {expired && <TouchableOpacity style={styles.secondary} disabled={payment.isFetching} onPress={() => void startAgain()}>
            <Text style={styles.secondaryText}>Chua thanh toan - Chon lai goi</Text>
          </TouchableOpacity>}
        </>}
        <Text selectable style={styles.caption}>Ma giao dich: {order.orderCode}</Text>
      </View>}

      {(plans.isPending || stored.isPending) && <ActivityIndicator color={colors.primary} />}
      {plans.data?.length === 0 && <Text style={styles.body}>Chua co goi nao duoc mo ban. Vui long quay lai sau.</Text>}

      {plans.data?.map(plan => <View key={plan.planId} style={styles.card}>
        <Text style={styles.cardTitle}>{plan.name}</Text>
        <Text style={styles.price}>{money(plan.price)}</Text>
        <Text style={styles.body}>/ {plan.billingIntervalMonths} thang</Text>
        {plan.features.map((feature, index) => <View style={styles.feature} key={index}>
          <MaterialIcon name="check" size={20} color={colors.primary} />
          <Text style={[styles.body, styles.featureText]}>{feature}</Text>
        </View>)}
        <TouchableOpacity
          accessibilityRole="button"
          disabled={blocked || plan.price <= 0}
          style={[styles.primary, (blocked || plan.price <= 0) && styles.disabled]}
          onPress={() => purchase(plan.planId)}
        >
          <Text style={styles.primaryText}>
            {current.data?.planId === plan.planId ? 'Goi hien tai' : plan.price <= 0 ? 'Goi mien phi' : 'Dang ky'}
          </Text>
        </TouchableOpacity>
      </View>)}

      <Text style={styles.caption}>Gia niem yet bang Viet Nam dong. Goi chi duoc kich hoat sau khi xac nhan thanh toan.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, paddingVertical: 8 },
  back: { padding: 12 },
  headerTitle: { color: c.onSurface, fontSize: 20, fontWeight: '700' },
  content: { padding: 20, gap: 18, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  title: { fontSize: 30, fontWeight: '800', color: c.onSurface },
  description: { color: c.onSurfaceVariant, fontSize: 16, lineHeight: 25, textAlign: 'center' },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.outlineVariant, borderRadius: 22, padding: 22, gap: 12 },
  cardTitle: { color: c.onSurface, fontSize: 21, fontWeight: '700' },
  price: { color: c.primary, fontSize: 30, fontWeight: '800' },
  body: { color: c.onSurfaceVariant, fontSize: 14, lineHeight: 23 },
  feature: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featureText: { flex: 1 },
  qrContainer: { alignItems: 'center', padding: 16, backgroundColor: 'white', borderRadius: 16, alignSelf: 'center' },
  primary: { backgroundColor: c.primary, padding: 15, borderRadius: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryText: { color: c.onPrimary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondary: { borderWidth: 1, borderColor: c.outlineVariant, padding: 14, borderRadius: 13, minHeight: 48, justifyContent: 'center' },
  secondaryText: { color: c.primary, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.45 },
  caption: { color: c.onSurfaceVariant, fontSize: 12, lineHeight: 20 },
  error: { color: c.error, fontSize: 14, lineHeight: 22 },
});
