/**
 * useSubscription — plan catalog + current customer subscription.
 *
 * On real-API day:
 *   queryFn for plans → GET /subscription-plans
 *   queryFn for current → GET /customers/me/subscription
 *   upgrade mutation → POST /customers/me/subscription
 *   cancel mutation → DELETE /customers/me/subscription
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import type { PlanCode, BillingCycle } from '@/types/subscription';
import {
  getPlans,
  getCurrentSubscription,
  upgradePlan,
  cancelSubscription,
} from '@/services/mock/subscriptions';

const PLANS_KEY = ['subscription-plans'] as const;
const subKey = (customerId: string | null) => ['subscription', customerId] as const;

// ─── Plan catalog ─────────────────────────────────────────────────────────────

export const useSubscriptionPlans = () =>
  useQuery({
    queryKey: PLANS_KEY,
    queryFn: getPlans,
    staleTime: 60 * 60 * 1000, // plans rarely change
  });

// ─── Current subscription ─────────────────────────────────────────────────────

export const useCurrentSubscription = () => {
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useQuery({
    queryKey: subKey(customerId),
    queryFn: () => {
      if (!customerId) throw new Error('not_authenticated');
      return getCurrentSubscription(customerId);
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useUpgradePlan = () => {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useMutation({
    mutationFn: ({
      planCode,
      billingCycle,
    }: {
      planCode: PlanCode;
      billingCycle: BillingCycle;
    }) => {
      if (!customerId) throw new Error('not_authenticated');
      return upgradePlan(customerId, planCode, billingCycle);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subKey(customerId) }),
  });
};

export const useCancelSubscription = () => {
  const qc = useQueryClient();
  const customerId = useAuthStore((s) => s.customer?.id ?? null);
  return useMutation({
    mutationFn: () => {
      if (!customerId) throw new Error('not_authenticated');
      return cancelSubscription(customerId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subKey(customerId) }),
  });
};
