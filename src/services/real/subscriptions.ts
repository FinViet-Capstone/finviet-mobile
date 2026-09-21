import { api, unwrap } from '@/lib/api';
import { idempotentConfig } from '@/lib/idempotency';
import { API_BASE_URL } from '@/lib/env';

export interface SubscriptionPlan {
  planId: string;
  name: string;
  price: number;
  billingIntervalMonths: number;
  features: string[];
  isActive: boolean;
}
export interface SubscriptionCheckout {
  paymentId: string;
  redirectUrl: string;
  amount: number;
  expiresAt: string;
}
export interface SubscriptionPayment {
  paymentId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  subscriptionId: string | null;
}
export interface CurrentSubscription {
  subscriptionId: string;
  planId: string | null;
  planName: string;
  status: string;
  lockedPrice: number;
  nextBillingDate: string | null;
}
export interface CheckoutAttempt {
  planId: string;
  key: string;
  returnUrl: string;
  checkout?: SubscriptionCheckout;
}

export const subscriptionReturnUrl = () =>
  process.env.EXPO_PUBLIC_VNPAY_RETURN_URL || `${API_BASE_URL.replace(/\/$/, '')}/subscriptions/vnpay/return`;

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return unwrap(await api.get('/subscriptions/plans'));
}
export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  return unwrap(await api.get('/subscriptions/current'));
}
export async function subscribeToPlan(attempt: CheckoutAttempt): Promise<SubscriptionCheckout> {
  return unwrap(await api.post('/subscriptions/subscribe', {
    planId: attempt.planId, returnUrl: attempt.returnUrl, // bankCode omitted: VNPay then offers whichever methods the terminal has enabled.
  }, idempotentConfig(attempt.key)));
}
export async function getSubscriptionPayment(id: string): Promise<SubscriptionPayment> {
  return unwrap(await api.get(`/subscriptions/payments/${encodeURIComponent(id)}`));
}
export function isVNPayUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(url.hostname);
  } catch { return false; }
}
