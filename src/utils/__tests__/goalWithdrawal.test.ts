import {
  executeGoalWithdrawal,
  runSingleFlight,
} from '../goalWithdrawal';

describe('runSingleFlight', () => {
  it('returns the same in-flight promise for repeated taps', async () => {
    let resolveOperation: ((value: string) => void) | undefined;
    const operation = jest.fn(() => new Promise<string>((resolve) => {
      resolveOperation = resolve;
    }));
    const state = { current: null as Promise<string> | null };

    const first = runSingleFlight(state, operation);
    const second = runSingleFlight(state, operation);

    expect(first).toBe(second);
    expect(operation).toHaveBeenCalledTimes(1);

    resolveOperation?.('done');
    await first;
    expect(state.current).toBeNull();
  });
});

describe('executeGoalWithdrawal', () => {
  it('advances goal-draining withdrawals after success', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();

    await executeGoalWithdrawal({
      mutate: jest.fn().mockResolvedValue(undefined),
      drainedGoal: true,
      onSuccess,
      onError,
    });

    expect(onSuccess).toHaveBeenCalledWith(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not mark ordinary partial withdrawals as goal-draining', async () => {
    const onSuccess = jest.fn();

    await executeGoalWithdrawal({
      mutate: jest.fn().mockResolvedValue(undefined),
      drainedGoal: false,
      onSuccess,
      onError: jest.fn(),
    });

    expect(onSuccess).toHaveBeenCalledWith(false);
  });

  it('surfaces a rejected withdrawal without running success cleanup', async () => {
    const error = new Error('network failure');
    const onSuccess = jest.fn();
    const onError = jest.fn();

    await executeGoalWithdrawal({
      mutate: jest.fn().mockRejectedValue(error),
      drainedGoal: true,
      onSuccess,
      onError,
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
