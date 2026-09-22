import { api, unwrap } from '@/lib/api';
import { idempotentConfig } from '@/lib/idempotency';

export interface SubscriptionPlan {
  planId: string;
  name: string;
  price: number;
  billingIntervalMonths: number;
  features: string[];
  isActive: boolean;
}

export interface PaymentOrder {
  orderCode: number;
  qrCode: string;
  amount: number;
  description: string;
  expiresAt: string;
}

export interface PaymentStatus {
  orderCode: number;
  status: 'pending' | 'succeeded' | 'failed' | 'expired';
  amount: number;
  subscriptionId: string | null;
}

export interface CurrentSubscription {
  subscriptionId: string;
  planId: string | null;
  planName: string;
  status: string;
  lockedPrice: number;
  expiresAt: string | null;
}

export interface CheckoutAttempt {
  planId: string;
  key: string;
  order?: PaymentOrder;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return unwrap(await api.get('/subscriptions/plans'));
}

export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  return unwrap(await api.get('/subscriptions/current'));
}

export async function createPaymentOrder(planId: string, idempotencyKey: string): Promise<PaymentOrder> {
  return unwrap(await api.post('/subscriptions/create-payment', { planId }, idempotentConfig(idempotencyKey)));
}

export async function getPaymentStatus(orderCode: number): Promise<PaymentStatus> {
  return unwrap(await api.get(`/subscriptions/payment-status/${orderCode}`));
}
