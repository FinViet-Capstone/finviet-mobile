/**
 * real/rules.ts — real .NET merchant-keyword rule service.
 *
 * Backend: api/rules/* (RulesController), ApiResponse<T> envelope.
 *   - GET    /rules            → RuleResponse[]
 *   - POST   /rules            → CreateRuleResponse { rule, appliedCount }  (201)
 *   - DELETE /rules/{id}       → 200 / 404
 *
 * Reads are async here (HTTP) where the mock was synchronous — every consumer
 * goes through TanStack Query's queryFn, which awaits either shape.
 */

import { api, unwrap } from '@/lib/api';
import type { Rule, CreateRuleInput, CreateRuleResult } from '@/types';

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

interface RuleDto {
  ruleId: string;
  merchantKeyword: string;
  categoryId: string;
  categoryName: string | null;
  appliedCount: number;
  createdAt: string;
}

interface CreateRuleDto {
  rule: RuleDto;
  appliedCount: number;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function toRule(dto: RuleDto): Rule {
  return {
    id: dto.ruleId,
    customerId: '',
    merchantKeyword: dto.merchantKeyword,
    categoryId: dto.categoryId,
    createdAt: dto.createdAt,
    // Backend has no separate updatedAt for rules (they are immutable once made).
    updatedAt: dto.createdAt,
  };
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getRules(): Promise<Rule[]> {
  const res = await api.get('/rules');
  return unwrap<RuleDto[]>(res).map(toRule);
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function createRule(input: CreateRuleInput): Promise<CreateRuleResult> {
  const res = await api.post('/rules', {
    merchantKeyword: input.merchantKeyword.trim(),
    categoryId: input.categoryId,
  });
  const data = unwrap<CreateRuleDto>(res);
  return { rule: toRule(data.rule), appliedCount: data.appliedCount };
}

export async function deleteRule(id: string): Promise<void> {
  await api.delete(`/rules/${id}`);
}
