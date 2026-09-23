import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { DARK_COLORS, LIGHT_COLORS } from '@/theme';
import { CategorySuggestionField, getCategoryStatus, type CategorySuggestionStatus } from '../CategorySuggestionField';

let mockColors: typeof DARK_COLORS | typeof LIGHT_COLORS = DARK_COLORS;
jest.mock('@/providers/ThemeProvider', () => ({
  useThemeColors: () => mockColors,
}));
jest.mock('@/components/common/MaterialIcon', () => ({
  MaterialIcon: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`icon:${name}`}</Text>;
  },
}));

const CATEGORY = { nameVi: 'Ăn uống', color: '#ff8800' };

describe('CategorySuggestionField', () => {
  describe.each([
    ['dark', DARK_COLORS],
    ['light', LIGHT_COLORS],
  ])('%s theme', (_name, palette) => {
    it.each<[CategorySuggestionStatus, string]>([
      ['ok', 'Ăn uống'],
      ['suggested', 'Ăn uống'],
      ['unsure', 'Chưa phân loại - chạm để chọn'],
      ['failed', 'AI không phân loại được - chạm để chọn'],
      ['pending', 'AI đang phân loại...'],
    ])('renders status %s', (status, text) => {
      mockColors = palette;
      const view = render(
        <CategorySuggestionField
          category={status === 'ok' || status === 'suggested' ? CATEGORY : null}
          source="ai"
          status={status}
          onPress={jest.fn()}
        />,
      );
      expect(view.getByText(text)).toBeTruthy();
    });
  });

  it('getCategoryStatus: ok with a category, unsure for income, failed for expense', () => {
    expect(getCategoryStatus(true, false)).toBe('ok');
    expect(getCategoryStatus(true, true)).toBe('ok');
    expect(getCategoryStatus(false, true)).toBe('unsure');
    expect(getCategoryStatus(false, false)).toBe('failed');
  });

  it('shows the category with an AI badge', () => {
    mockColors = DARK_COLORS;
    const view = render(<CategorySuggestionField category={CATEGORY} source="ai" status="ok" onPress={jest.fn()} />);
    expect(view.getByText('Ăn uống')).toBeTruthy();
    expect(view.getByText('AI')).toBeTruthy();
    expect(view.queryByText('Quy tắc')).toBeNull();
  });

  it('shows a Quy tắc badge for rule-sourced categories', () => {
    mockColors = DARK_COLORS;
    const view = render(<CategorySuggestionField category={CATEGORY} source="rule" status="ok" onPress={jest.fn()} />);
    expect(view.getByText('Quy tắc')).toBeTruthy();
    expect(view.queryByText('AI')).toBeNull();
  });

  it('shows no badge for a manually chosen category (source null)', () => {
    mockColors = DARK_COLORS;
    const view = render(<CategorySuggestionField category={CATEGORY} source={null} status="ok" onPress={jest.fn()} />);
    expect(view.getByText('Ăn uống')).toBeTruthy();
    expect(view.queryByText('AI')).toBeNull();
    expect(view.queryByText('Quy tắc')).toBeNull();
  });

  it('calls onPress when a resolved category is tapped', () => {
    mockColors = DARK_COLORS;
    const onPress = jest.fn();
    const view = render(<CategorySuggestionField category={CATEGORY} source="ai" status="ok" onPress={onPress} />);
    fireEvent.press(view.getByText('Ăn uống'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('failed without onRetry: red pick hint, no retry affordance', () => {
    mockColors = DARK_COLORS;
    const onPress = jest.fn();
    const view = render(<CategorySuggestionField category={null} source={null} status="failed" onPress={onPress} />);
    fireEvent.press(view.getByText('AI không phân loại được - chạm để chọn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.queryByLabelText('Thử phân loại lại')).toBeNull();
  });

  it('failed with onRetry: retry affordance calls onRetry, not onPress', () => {
    mockColors = DARK_COLORS;
    const onPress = jest.fn();
    const onRetry = jest.fn();
    const view = render(
      <CategorySuggestionField category={null} source={null} status="failed" onPress={onPress} onRetry={onRetry} />,
    );
    fireEvent.press(view.getByLabelText('Thử phân loại lại'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    expect(view.getByText('AI không phân loại được - thử lại')).toBeTruthy();
  });

  it('failed with onRetry: the picker stays reachable through the chevron', () => {
    mockColors = DARK_COLORS;
    const onPress = jest.fn();
    const onRetry = jest.fn();
    const view = render(
      <CategorySuggestionField category={null} source={null} status="failed" onPress={onPress} onRetry={onRetry} />,
    );
    fireEvent.press(view.getByText('icon:chevron_right'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('unsure: neutral prompt to choose', () => {
    mockColors = DARK_COLORS;
    const onPress = jest.fn();
    const view = render(<CategorySuggestionField category={null} source={null} status="unsure" onPress={onPress} />);
    fireEvent.press(view.getByText('Chưa phân loại - chạm để chọn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('pending: spinner and progress text, not pressable', () => {
    mockColors = DARK_COLORS;
    const onPress = jest.fn();
    const view = render(<CategorySuggestionField category={null} source={null} status="pending" onPress={onPress} />);
    expect(view.getByText('AI đang phân loại...')).toBeTruthy();
    fireEvent.press(view.getByText('AI đang phân loại...'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('never renders a confidence percentage', () => {
    mockColors = DARK_COLORS;
    const view = render(<CategorySuggestionField category={CATEGORY} source="ai" status="suggested" onPress={jest.fn()} />);
    expect(view.queryByText(/%/)).toBeNull();
  });
});
