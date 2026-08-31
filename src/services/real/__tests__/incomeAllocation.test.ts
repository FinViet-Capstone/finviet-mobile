import { AxiosError, AxiosHeaders } from 'axios';
import { api } from '@/lib/api';
import {
  applySavingsPlanRecommendation,
  getSavingsPlanRecommendation,
} from '../incomeAllocation';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  unwrap: (res: { data: { data: unknown } }) => res.data.data,
}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;

function envelope<T>(data: T) {
  return { data: { success: true, data } };
}

function axiosErrorWithStatus(status: number): AxiosError {
  const err = new AxiosError('request failed');
  err.response = {
    status,
    statusText: '',
    data: {},
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

const adjustableDto = {
  month: '2026-08',
  status: 'adjustable',
  monthlyIncome: 20_000_000,
  requiredMonthlySavings: 5_000_000,
  currentSavingsCap: 4_000_000,
  shortfall: 1_000_000,
  goalsConsidered: 2,
  goalsWithoutDeadline: 1,
  proposed: {
    effectiveMonth: '2026-09',
    monthlyIncome: 20_000_000,
    needsPct: 50,
    wantsPct: 25,
    savingsPct: 25,
  },
  proposedNeedsCap: 10_000_000,
  proposedWantsCap: 5_000_000,
  proposedSavingsCap: 5_000_000,
  maxFundableMonthlySavings: null,
  totalRemainingAmount: 30_000_000,
  minimumMonthsToFund: null,
  maximumFundableTargetAmount: null,
  pendingBeforeApply: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getSavingsPlanRecommendation', () => {
  it('flattens the nested proposed entry into sibling percentage fields', async () => {
    mockedGet.mockResolvedValueOnce(envelope(adjustableDto));

    const result = await getSavingsPlanRecommendation();

    expect(result).not.toBeNull();
    expect(result!.status).toBe('adjustable');
    expect(result!.proposedSavingsPct).toBe(25);
    expect(result!.proposedWantsPct).toBe(25);
    expect(result!.proposedNeedsPct).toBe(50);
    expect(result!.proposedWantsCap).toBe(5_000_000);
    expect(result!.goalsWithoutDeadline).toBe(1);
  });

  it('leaves the proposed percentages null when the backend sends no proposal', async () => {
    mockedGet.mockResolvedValueOnce(
      envelope({
        ...adjustableDto,
        status: 'infeasible',
        proposed: null,
        proposedNeedsCap: null,
        proposedWantsCap: null,
        proposedSavingsCap: null,
        maxFundableMonthlySavings: 9_000_000,
      }),
    );

    const result = await getSavingsPlanRecommendation();

    expect(result!.proposedSavingsPct).toBeNull();
    expect(result!.maxFundableMonthlySavings).toBe(9_000_000);
  });

  it('maps the pending split that applying would replace', async () => {
    // The screen needs this to warn before discarding a draft the customer set themselves.
    mockedGet.mockResolvedValueOnce(
      envelope({
        ...adjustableDto,
        pendingBeforeApply: {
          effectiveMonth: '2026-09',
          monthlyIncome: 5_000_000,
          needsPct: 61,
          wantsPct: 23.4,
          savingsPct: 15.6,
        },
      }),
    );

    const result = await getSavingsPlanRecommendation();

    expect(result!.pendingBeforeApply).not.toBeNull();
    expect(result!.pendingBeforeApply!.savingsPct).toBe(15.6);
    expect(result!.pendingBeforeApply!.effectiveMonth).toBe('2026-09');
  });

  it('leaves pendingBeforeApply null when nothing is scheduled', async () => {
    mockedGet.mockResolvedValueOnce(envelope(adjustableDto));

    const result = await getSavingsPlanRecommendation();

    expect(result!.pendingBeforeApply).toBeNull();
  });

  it('carries the infeasible escape hatches through', async () => {
    // Without these the banner can only say "giãn thời hạn" with no number, which is the gap
    // this pass exists to close.
    mockedGet.mockResolvedValueOnce(
      envelope({
        ...adjustableDto,
        status: 'infeasible',
        proposed: null,
        maxFundableMonthlySavings: 2_250_000,
        totalRemainingAmount: 27_000_000,
        minimumMonthsToFund: 12,
        maximumFundableTargetAmount: 9_500_000,
      }),
    );

    const result = await getSavingsPlanRecommendation();

    expect(result!.totalRemainingAmount).toBe(27_000_000);
    expect(result!.minimumMonthsToFund).toBe(12);
    expect(result!.maximumFundableTargetAmount).toBe(9_500_000);
  });

  it('resolves to null on 404 so the screen can fall back instead of erroring', async () => {
    // This ships ahead of the backend reaching Render. A thrown error here would
    // make the over-allocation warning vanish entirely on the live deployment.
    mockedGet.mockRejectedValueOnce(axiosErrorWithStatus(404));

    await expect(getSavingsPlanRecommendation()).resolves.toBeNull();
  });

  it('still throws on any other failure', async () => {
    mockedGet.mockRejectedValueOnce(axiosErrorWithStatus(500));

    await expect(getSavingsPlanRecommendation()).rejects.toThrow();
  });

  it('passes month through when given', async () => {
    mockedGet.mockResolvedValueOnce(envelope(adjustableDto));

    await getSavingsPlanRecommendation('2026-07');

    expect(mockedGet).toHaveBeenCalledWith(
      '/profile/income-allocation/recommendation',
      { params: { month: '2026-07' } },
    );
  });
});

describe('applySavingsPlanRecommendation', () => {
  it('posts no payload — the backend recomputes the split itself', async () => {
    // Sending a proposal from here would let a stale one (a goal edited since
    // the GET) be written as the customer's real allocation.
    mockedPost.mockResolvedValueOnce(
      envelope({
        effectiveMonth: '2026-09',
        monthlyIncome: 20_000_000,
        needsPct: 50,
        wantsPct: 25,
        savingsPct: 25,
      }),
    );

    const result = await applySavingsPlanRecommendation();

    expect(mockedPost).toHaveBeenCalledWith('/profile/income-allocation/recommendation/apply');
    expect(mockedPost.mock.calls[0]).toHaveLength(1);
    expect(result.savingsPct).toBe(25);
    expect(result.effectiveMonth).toBe('2026-09');
  });
});
