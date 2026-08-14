import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import {
  addGoalContribution,
  getGoalById,
  getGoals,
  updateGoal,
  withdrawFromGoal,
} from '@/services/real/goals';

const GOAL_DTO = {
  goalId: 'goal/one',
  customerId: 'customer-1',
  goalName: 'Quỹ dự phòng',
  iconEmoji: '🛟',
  targetAmount: 10_000_000,
  currentAmount: 0,
  deadline: null,
  fundingWalletId: null,
  remainingAmount: 10_000_000,
  progressPercent: 0,
  daysRemaining: null,
  isCompleted: false,
  monthlySavingNeeded: null,
  monthsRemaining: null,
  isDeleted: true,
  createdAt: '2026-08-14T01:00:00Z',
  updatedAt: '2026-08-14T02:00:00Z',
};

function success<T>(data: T) {
  return { success: true, data };
}

describe('real goals service', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('maps nullable fields and archived server state without fabricating values', async () => {
    mock.onGet('/saving-goals', { params: { archived: true } }).reply(200, success([GOAL_DTO]));

    const [goal] = await getGoals(true);

    expect(goal).toMatchObject({
      id: GOAL_DTO.goalId,
      iconEmoji: GOAL_DTO.iconEmoji,
      deadline: null,
      isDeleted: true,
      createdAt: GOAL_DTO.createdAt,
      updatedAt: GOAL_DTO.updatedAt,
    });
  });

  it('returns undefined only for a 404 detail response and encodes the path id', async () => {
    mock.onGet('/saving-goals/goal%2Fone').reply(404, { success: false });
    await expect(getGoalById('goal/one')).resolves.toBeUndefined();

    mock.onGet('/saving-goals/goal%2Ftwo').reply(500, { success: false });
    await expect(getGoalById('goal/two')).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('omits an unchanged deadline and sends supplied idempotency keys', async () => {
    mock.onPatch('/saving-goals/goal%2Fone').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ goalName: 'Tên mới' });
      return [200, success(GOAL_DTO)];
    });
    await updateGoal('goal/one', { name: ' Tên mới ' });

    mock.onPost('/saving-goals/goal%2Fone/contribute').reply((config) => {
      expect(config.headers?.['Idempotency-Key']).toBe('same-key');
      return [200, success(GOAL_DTO)];
    });
    await addGoalContribution('goal/one', { amount: 1 }, 'same-key');

    mock.onPost('/saving-goals/goal%2Fone/withdraw').reply((config) => {
      expect(config.headers?.['Idempotency-Key']).toBe('same-key');
      return [200, success(GOAL_DTO)];
    });
    await withdrawFromGoal(
      'goal/one',
      { amount: 1, walletId: 'wallet-1' },
      'same-key',
    );
  });
});
