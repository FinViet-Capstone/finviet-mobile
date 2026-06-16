/**
 * subscription.ts - FinViet type definitions for the Subscription domain (v2).
 *
 * Two-table model:
 *   SubscriptionPlan     — global catalog of available plans (admin-managed).
 *   CustomerSubscription — the active subscription for a customer.
 *
 * FE gating: read planCode + status from CustomerSubscription; compare against
 * local PREMIUM_FEATURES constant (post-MVP). Never hardcode plan names in gate checks.
 */

// -------------------------------------------------------------------------
// SubscriptionPlan — global catalog
// -------------------------------------------------------------------------

export type PlanCode = 'free' | 'basic' | 'premium';
export type BillingCycle = 'monthly' | 'annual';

export interface SubscriptionPlan {
  /** Stable identifier, used for FE feature gating */
  planCode: PlanCode;
  nameVi: string;
  nameEn: string;
  /** Monthly price in whole VND (0 for free) */
  monthlyPrice: number;
  /** Annual price in whole VND (0 for free) */
  annualPrice: number;
  /** Human-readable feature bullet points (Vietnamese) */
  featuresVi: string[];
  isPopular?: boolean;
}

// -------------------------------------------------------------------------
// CustomerSubscription — per-customer active subscription
// -------------------------------------------------------------------------

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export interface CustomerSubscription {
  id: string;
  customerId: string;
  planCode: PlanCode;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  /** ISO 8601 date string "YYYY-MM-DD" — when the current period ends */
  currentPeriodEnd: string;
  /** true when the subscription will not renew after currentPeriodEnd */
  cancelAtPeriodEnd: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}
