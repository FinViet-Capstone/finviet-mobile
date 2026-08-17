/**
 * Unit tests for getApiErrorMessage's priority order: recognized `code` (incl. the
 * dynamic sepay_error_{status} pattern) beats the raw backend `message`, which beats
 * the first FluentValidation field error, which beats the caller's fallback.
 */

import { getApiErrorMessage, BUSINESS_RULE_MESSAGES_VI } from '../errors';

function fakeAxiosError(status: number, data: Record<string, unknown>) {
  return { isAxiosError: true, response: { status, data } };
}

describe('getApiErrorMessage', () => {
  it('prefers a recognized code over the raw message', () => {
    const err = fakeAxiosError(422, { code: 'last_wallet', message: 'Cannot delete the last active wallet.' });
    expect(getApiErrorMessage(err, 'fallback')).toBe(BUSINESS_RULE_MESSAGES_VI.last_wallet);
  });

  it('maps an incompatible transaction category to the Vietnamese business-rule message', () => {
    const err = fakeAxiosError(422, {
      code: 'category_type_mismatch',
      message: 'Category type does not match transaction type.',
    });

    expect(getApiErrorMessage(err, 'fallback')).toBe(
      BUSINESS_RULE_MESSAGES_VI.category_type_mismatch,
    );
  });

  it('maps the dynamic sepay_error_{status} catch-all to the generic SePay message', () => {
    const err = fakeAxiosError(502, { code: 'sepay_error_418', message: "SePay failed with HTTP 418." });
    expect(getApiErrorMessage(err, 'fallback')).toBe('SePay đang gặp sự cố. Vui lòng thử lại sau.');
  });

  it('falls back to the raw message when the code is unrecognized', () => {
    const err = fakeAxiosError(422, { code: 'some_new_code_not_mapped_yet', message: 'Something specific broke.' });
    expect(getApiErrorMessage(err, 'fallback')).toBe('Something specific broke.');
  });

  it('falls back to the raw message when there is no code at all', () => {
    const err = fakeAxiosError(400, { message: 'Category name is required.' });
    expect(getApiErrorMessage(err, 'fallback')).toBe('Category name is required.');
  });

  it('falls back to the first FluentValidation field error when message is blank', () => {
    const err = fakeAxiosError(400, {
      message: '',
      errors: { Email: ['Email is required.'], Password: ['Password is required.'] },
    });
    expect(getApiErrorMessage(err, 'fallback')).toBe('Email is required.');
  });

  it('returns the caller fallback when nothing usable is present', () => {
    const err = fakeAxiosError(500, {});
    expect(getApiErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('returns the caller fallback for a non-axios error', () => {
    expect(getApiErrorMessage(new Error('plain error'), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage('a string', 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('covers every documented code with a non-empty Vietnamese message', () => {
    const empty = Object.entries(BUSINESS_RULE_MESSAGES_VI)
      .filter(([, message]) => message.trim().length === 0)
      .map(([code]) => code);
    expect(empty).toEqual([]);
  });
});
