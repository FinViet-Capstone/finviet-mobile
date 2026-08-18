import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getProfile, updateProfileSettings } from '@/services/real/auth';

// Backend AppTheme has no JsonStringEnumConverter registered, so it serializes
// as a raw integer on the wire (0 Light, 1 Dark, 2 System) in both directions.
describe('real auth service — theme enum mapping', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it('sends theme as an integer, not a string, on save', async () => {
    mock.onPut('/profile/settings').reply(200, { success: true, data: {} });

    await updateProfileSettings({ theme: 'dark' });

    expect(JSON.parse(mock.history.put[0].data)).toEqual({ theme: 1 });
  });

  it.each([
    [0, 'light'],
    [1, 'dark'],
    [2, 'system'],
  ])('maps raw theme %d from GET /profile to %s', async (raw, expected) => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        customerId: 'c1',
        fullName: 'Test User',
        email: 'test@example.com',
        isEmailVerified: true,
        isActive: true,
        theme: raw,
      },
    });

    const customer = await getProfile();
    expect(customer.theme).toBe(expected);
  });

  it('falls back to system when the backend sends no theme at all', async () => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        customerId: 'c1',
        fullName: 'Test User',
        email: 'test@example.com',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const customer = await getProfile();
    expect(customer.theme).toBe('system');
  });
});
