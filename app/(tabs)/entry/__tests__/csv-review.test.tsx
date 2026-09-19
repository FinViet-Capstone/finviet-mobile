import React from 'react';
import { Text } from 'react-native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { router, Slot } from 'expo-router';

// Regression coverage for: leaving csv-review.tsx (header back, error-state "Quay lại",
// bottom "Huỷ") must reach the entry-method chooser regardless of how the screen was
// reached — a bare `router.back()` only pops one level when this screen's own push
// history is intact (landing on csv-import, not the chooser), and jumps out of the
// entry tab entirely (to Home) when it isn't — e.g. reached via a notification tap
// after the app was suspended/killed in the background, so csv-review is the only
// entry in its stack. Diagnosed via a throwaway `expo-router/testing-library` harness
// that confirmed both stack shapes before the fix; this locks the fixed behavior in
// against the real screen, not a stand-in.

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
  useExtractFromCsv: () => ({ mutateAsync: jest.fn().mockRejectedValue(new Error('extraction failed')) }),
}));
jest.mock('@/hooks/useCategoryCatalog', () => ({ useCategoryCatalog: () => ({ get: () => null }) }));
jest.mock('@/components/categories', () => ({ CategoryPickerSheet: () => null }));
jest.mock('@/lib/notifications', () => ({ scheduleCsvImportReadyNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/stores/ephemeralBannerStore', () => ({
  useEphemeralBannerStore: (selector: (s: { show: () => void }) => unknown) => selector({ show: jest.fn() }),
}));

function overrides() {
  return {
    _layout: () => <Slot />,
    index: () => null,
    '(tabs)/home/index': () => <Text testID="home-screen">home</Text>,
  };
}

const CSV_PARAMS = 'fileUri=file%3A%2F%2Ftmp%2Fa.csv&fileName=a.csv';

it('warm case: header back reaches the chooser, not csv-import, after an in-flight extraction errors', async () => {
  const view = renderRouter({ appDir: 'app', overrides: overrides() }, { initialUrl: '/(tabs)/entry' });

  act(() => router.push('/(tabs)/entry/csv-import'));
  act(() => router.push({ pathname: '/(tabs)/entry/csv-review', params: { fileUri: 'file://tmp/a.csv', fileName: 'a.csv' } }));

  await waitFor(() => expect(view.getByText('Không đọc được file CSV')).toBeTruthy());

  fireEvent.press(view.getByLabelText('Quay lại'));

  expect(view.getPathname()).toBe('/entry');
  expect(view.queryByTestId('csv-review-screen')).toBeNull();
});

it('cold-start case: header back reaches the chooser, not Home, when csv-review has no ancestor in its stack', async () => {
  const view = renderRouter(
    { appDir: 'app', overrides: overrides() },
    { initialUrl: `/(tabs)/entry/csv-review?${CSV_PARAMS}` },
  );

  await waitFor(() => expect(view.getByText('Không đọc được file CSV')).toBeTruthy());

  fireEvent.press(view.getByLabelText('Quay lại'));

  expect(view.getPathname()).toBe('/entry');
  expect(view.queryByTestId('home-screen')).toBeNull();
});

it('error-state "Quay lại" button also reaches the chooser', async () => {
  const view = renderRouter({ appDir: 'app', overrides: overrides() }, { initialUrl: '/(tabs)/entry' });

  act(() => router.push('/(tabs)/entry/csv-import'));
  act(() => router.push({ pathname: '/(tabs)/entry/csv-review', params: { fileUri: 'file://tmp/a.csv', fileName: 'a.csv' } }));

  const goBackText = await waitFor(() => view.getByText('Quay lại'));
  fireEvent.press(goBackText);

  expect(view.getPathname()).toBe('/entry');
});
