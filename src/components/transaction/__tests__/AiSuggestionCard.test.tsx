import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { DARK_COLORS } from '@/theme';
import { AiSuggestionCard, getStoredAiSuggestion } from '../AiSuggestionCard';

const mockColors = DARK_COLORS;
jest.mock('@/providers/ThemeProvider', () => ({
  useThemeColors: () => mockColors,
}));
jest.mock('@/components/common/MaterialIcon', () => ({
  MaterialIcon: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`icon:${name}`}</Text>;
  },
}));

const suggestedTx = {
  categorizationStatus: 'suggested' as const,
  aiSuggestedCategoryId: 'cat_food',
  aiSuggestedCategoryName: 'Ăn uống',
  aiConfidence: 0.82,
};

describe('getStoredAiSuggestion', () => {
  it('returns the stored suggestion for a suggested row', () => {
    expect(getStoredAiSuggestion(suggestedTx)).toEqual({
      categoryId: 'cat_food',
      categoryName: 'Ăn uống',
      confidence: 0.82,
    });
  });

  it('falls back to the catalog name when the row has no stored name', () => {
    const tx = { ...suggestedTx, aiSuggestedCategoryName: null };
    expect(getStoredAiSuggestion(tx, 'Ăn uống')?.categoryName).toBe('Ăn uống');
  });

  it.each(['none', 'pending', 'unsure', 'failed', 'applied', 'reviewed'] as const)(
    'returns null for status %s so the live button stays',
    (categorizationStatus) => {
      expect(getStoredAiSuggestion({ ...suggestedTx, categorizationStatus })).toBeNull();
    },
  );

  it('returns null when a suggested row has no suggested category id', () => {
    expect(getStoredAiSuggestion({ ...suggestedTx, aiSuggestedCategoryId: null })).toBeNull();
  });
});

describe('AiSuggestionCard', () => {
  const suggestion = { categoryId: 'cat_food', categoryName: 'Ăn uống', confidence: 0.82 };

  it('shows category, AI badge and confidence', () => {
    const view = render(<AiSuggestionCard suggestion={suggestion} onApply={jest.fn()} onDismiss={jest.fn()} />);
    expect(view.getByText('Ăn uống')).toBeTruthy();
    expect(view.getByText('AI')).toBeTruthy();
    expect(view.getByText('Độ tin cậy 82%')).toBeTruthy();
  });

  it('omits confidence when none is reported', () => {
    const view = render(
      <AiSuggestionCard suggestion={{ ...suggestion, confidence: null }} onApply={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(view.queryByText(/Độ tin cậy/)).toBeNull();
  });

  it('fires apply and dismiss', () => {
    const onApply = jest.fn();
    const onDismiss = jest.fn();
    const view = render(<AiSuggestionCard suggestion={suggestion} onApply={onApply} onDismiss={onDismiss} />);
    fireEvent.press(view.getByText('Áp dụng'));
    fireEvent.press(view.getByText('Bỏ qua'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
