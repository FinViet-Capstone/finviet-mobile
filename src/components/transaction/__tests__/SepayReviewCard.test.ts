import { getReviewField } from '../SepayReviewCard';
import type { CategorizationStatus, Transaction } from '@/types';

function tx(categorizationStatus: CategorizationStatus, aiSuggestedCategoryId: string | null = null): Transaction {
  return { categorizationStatus, aiSuggestedCategoryId } as Transaction;
}

describe('getReviewField', () => {
  it('shows a suggestion as the AI category, never as "suggested" text', () => {
    expect(getReviewField(tx('suggested', 'cat_food'), false)).toEqual({
      status: 'suggested', source: 'ai', suggestedCategoryId: 'cat_food',
    });
  });

  it('maps pending, unsure and failed to their own states', () => {
    expect(getReviewField(tx('pending'), false).status).toBe('pending');
    expect(getReviewField(tx('unsure'), false).status).toBe('unsure');
    expect(getReviewField(tx('failed'), false).status).toBe('failed');
  });

  it('with AI off, drops the AI badge and renders failed as unsure', () => {
    expect(getReviewField(tx('failed'), true).status).toBe('unsure');
    expect(getReviewField(tx('suggested', 'cat_food'), true)).toEqual({
      status: 'unsure', source: null, suggestedCategoryId: null,
    });
  });
});
