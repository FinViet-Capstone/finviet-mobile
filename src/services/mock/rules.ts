/**
 * mock/rules.ts — merchant→category auto-classification rules.
 *
 * Mirrors the shape the real .NET API will return so only the queryFn/mutationFn
 * bodies change on integration day. Reads are synchronous; writes are async
 * (matching the rest of the mock layer).
 */

import type { Rule } from '../../types';
import { USER_ID } from './wallets';
import { applyMerchantRule } from './transactions';

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function genRuleId(): string {
  return `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Mock Data (mutable) ─────────────────────────────────────────────────────

let RULES: Rule[] = [];

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getRules(): Rule[] {
  return [...RULES];
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export interface CreateRuleInput {
  merchantKeyword: string;
  categoryId: string;
}

export interface CreateRuleResult {
  rule: Rule;
  /** How many existing transactions were retroactively re-categorised. */
  appliedCount: number;
}

export async function createRule(
  input: CreateRuleInput,
): Promise<CreateRuleResult> {
  await delay();
  const rule: Rule = {
    id: genRuleId(),
    customerId: USER_ID,
    merchantKeyword: input.merchantKeyword.trim(),
    categoryId: input.categoryId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  RULES = [...RULES, rule];
  const appliedCount = applyMerchantRule(rule.merchantKeyword, rule.categoryId);
  return { rule, appliedCount };
}

export async function deleteRule(id: string): Promise<void> {
  await delay();
  RULES = RULES.filter((r) => r.id !== id);
}
