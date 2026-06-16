/**
 * mock/subscriptions.ts
 *
 * Plan catalog + per-customer subscription state.
 * Upgrade/cancel are simulated in-memory.
 */

import type {
  SubscriptionPlan,
  CustomerSubscription,
  PlanCode,
  BillingCycle,
} from '@/types/subscription';
import { USER_ID } from './wallets';

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Plan catalog ─────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    planCode: 'free',
    nameVi: 'Miễn phí',
    nameEn: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    featuresVi: [
      'Theo dõi thu chi cơ bản',
      'Tối đa 2 ví',
      'Báo cáo tháng',
      'Nhập thủ công & SMS',
    ],
  },
  {
    planCode: 'basic',
    nameVi: 'Cơ bản',
    nameEn: 'Basic',
    monthlyPrice: 29_000,
    annualPrice: 290_000,
    featuresVi: [
      'Tất cả tính năng miễn phí',
      'Không giới hạn ví',
      'Nhập ảnh hoá đơn (OCR)',
      'Mục tiêu tiết kiệm không giới hạn',
      'Xuất CSV',
    ],
  },
  {
    planCode: 'premium',
    nameVi: 'Cao cấp',
    nameEn: 'Premium',
    monthlyPrice: 59_000,
    annualPrice: 590_000,
    featuresVi: [
      'Tất cả tính năng cơ bản',
      'AI phân loại tự động',
      'Trợ lý tài chính AI (chat)',
      'Kết nối ngân hàng tự động',
      'Báo cáo nâng cao',
      'Ưu tiên hỗ trợ',
    ],
    isPopular: true,
  },
];

// ─── In-memory customer subscription ─────────────────────────────────────────

let _subscription: CustomerSubscription = {
  id: 'sub_khoi_01',
  customerId: USER_ID,
  planCode: 'free',
  billingCycle: 'monthly',
  status: 'active',
  currentPeriodEnd: '2099-12-31',
  cancelAtPeriodEnd: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── Service functions ────────────────────────────────────────────────────────

export async function getPlans(): Promise<SubscriptionPlan[]> {
  await delay();
  return SUBSCRIPTION_PLANS;
}

export async function getCurrentSubscription(
  customerId: string,
): Promise<CustomerSubscription> {
  await delay();
  return { ..._subscription };
}

export async function upgradePlan(
  customerId: string,
  planCode: PlanCode,
  billingCycle: BillingCycle,
): Promise<CustomerSubscription> {
  await delay();
  const now = new Date();
  const periodEnd =
    billingCycle === 'annual'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          .toISOString()
          .split('T')[0]
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          .toISOString()
          .split('T')[0];

  _subscription = {
    ..._subscription,
    planCode,
    billingCycle,
    status: 'active',
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    updatedAt: new Date().toISOString(),
  };
  return { ..._subscription };
}

export async function cancelSubscription(
  customerId: string,
): Promise<CustomerSubscription> {
  await delay();
  _subscription = {
    ..._subscription,
    cancelAtPeriodEnd: true,
    updatedAt: new Date().toISOString(),
  };
  return { ..._subscription };
}
