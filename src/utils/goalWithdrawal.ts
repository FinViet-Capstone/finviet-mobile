interface SingleFlightState<T> {
  current: Promise<T> | null;
}

export function runSingleFlight<T>(
  state: SingleFlightState<T>,
  operation: () => Promise<T>,
): Promise<T> {
  if (state.current) return state.current;

  const promise = operation();
  state.current = promise;
  void promise.finally(() => {
    if (state.current === promise) state.current = null;
  }).catch(() => undefined);
  return promise;
}

interface ExecuteGoalWithdrawalOptions {
  mutate: () => Promise<unknown>;
  wasWithdrawAll: boolean;
  onSuccess: (wasWithdrawAll: boolean) => void;
  onError: (error: unknown) => void;
}

export async function executeGoalWithdrawal({
  mutate,
  wasWithdrawAll,
  onSuccess,
  onError,
}: ExecuteGoalWithdrawalOptions): Promise<void> {
  try {
    await mutate();
    onSuccess(wasWithdrawAll);
  } catch (error) {
    onError(error);
  }
}
