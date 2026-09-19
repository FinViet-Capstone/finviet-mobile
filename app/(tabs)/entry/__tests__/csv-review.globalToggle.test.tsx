import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Slot } from 'expo-router';

// Regression coverage for ticket #85: the sticky global Categorized/Parsed toggle on the CSV
// review screen's summary row must set every row's view at once, override any row already
// flipped individually (global always wins), and leave per-row toggles independently usable
// afterward.

jest.mock('@/providers/ThemeProvider', () => ({
  useThemeColors: () => jest.requireActual<typeof import('@/theme')>('@/theme').COLORS,
  ThemeProvider: ({ children }: any) => children,
}));
jest.mock('@/components/common/MaterialIcon', () => ({ MaterialIcon: () => null }));
jest.mock('@/components/common/TabBarIcon', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

jest.mock('@/hooks/useWallets', () => ({ useWallets: () => ({ data: [] }) }));
jest.mock('@/hooks/useTransactions', () => ({
  useTransactions: () => ({ data: [] }),
  useCreateTransaction: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/hooks', () => ({
  useRules: () => ({ data: [] }),
  useExtractFromCsv: () => ({
    mutateAsync: jest.fn().mockResolvedValue({
      rows: [
        {
          amount: 50000, type: 'expense', merchant: 'CONG TY TNHH SHOPEE', description: 'CONG TY TNHH SHOPEE',
          transactionDate: '2026-09-01', categoryId: 'cat_food', categoryName: 'Ăn uống', confidence: 0.9,
        },
        {
          amount: 20000, type: 'expense', merchant: 'UNKNOWN MERCHANT', description: 'UNKNOWN MERCHANT',
          transactionDate: '2026-09-02', categoryId: null, categoryName: null, confidence: null,
        },
      ],
    }),
  }),
}));
jest.mock('@/hooks/useCategoryCatalog', () => ({
  useCategoryCatalog: () => ({
    get: (id: string | null) => (id === 'cat_food' ? { id: 'cat_food', nameVi: 'Ăn uống', color: '#F97316' } : null),
  }),
}));
jest.mock('@/components/categories', () => ({ CategoryPickerSheet: () => null }));
jest.mock('@/lib/notifications', () => ({ scheduleCsvImportReadyNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/stores/ephemeralBannerStore', () => ({
  useEphemeralBannerStore: (selector: (s: { show: () => void }) => unknown) => selector({ show: jest.fn() }),
}));

function overrides() {
  return { _layout: () => <Slot />, index: () => null };
}

const CSV_PARAMS = 'fileUri=file%3A%2F%2Ftmp%2Fa.csv&fileName=a.csv';

async function renderReady() {
  const view = renderRouter({ appDir: 'app', overrides: overrides() }, { initialUrl: `/(tabs)/entry/csv-review?${CSV_PARAMS}` });
  await waitFor(() => expect(view.getByText('Ăn uống')).toBeTruthy());
  return view;
}

it('global toggle sets every row to Parsed at once, hiding the category resolved for row 1', async () => {
  const view = await renderReady();

  expect(view.getByText('Ăn uống')).toBeTruthy(); // row 1's Categorized category, visible by default

  fireEvent.press(view.getByTestId('global-view-toggle-parsed'));

  expect(view.queryByText('Ăn uống')).toBeNull();
  expect(view.getAllByText('Chưa phân loại')).toHaveLength(2); // both rows now show the plain Parsed snapshot
});

it('global toggle overrides a row already flipped individually', async () => {
  const view = await renderReady();

  // Flip row 1 to Parsed by hand first.
  fireEvent.press(view.getByTestId('row-view-toggle-csv_0_2026-09-01_50000-parsed'));
  expect(view.queryByText('Ăn uống')).toBeNull();

  // Global "Đã phân loại" should force row 1 back to Categorized, overwriting that manual flip.
  fireEvent.press(view.getByTestId('global-view-toggle-categorized'));

  expect(view.getByText('Ăn uống')).toBeTruthy();
});

it('a row can still be flipped individually after the global toggle was used', async () => {
  const view = await renderReady();

  fireEvent.press(view.getByTestId('global-view-toggle-parsed'));
  expect(view.queryByText('Ăn uống')).toBeNull();

  // Flip just row 1 back to Categorized — row 2 should stay Parsed.
  fireEvent.press(view.getByTestId('row-view-toggle-csv_0_2026-09-01_50000-categorized'));

  expect(view.getByText('Ăn uống')).toBeTruthy();
  expect(view.getAllByText('Chưa phân loại')).toHaveLength(1); // only row 2 still Parsed
});
