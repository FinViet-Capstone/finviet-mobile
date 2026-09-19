import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { getCustomerCategories } from '@/services/real/categories';

function success<T>(data: T) {
  return { success: true, data };
}

// GET /categories is the only source of a customer-created category's name,
// colour and icon — the FE's compiled catalog knows nothing about it. This
// mapper used to drop all three, which is why such a category could not be
// rendered anywhere outside the bucket editor.
describe('real categories service — display fields', () => {
  const mock = new AxiosMockAdapter(api);

  afterEach(() => mock.reset());
  afterAll(() => mock.restore());

  it("carries the backend's name, colour and icon onto each row", async () => {
    mock.onGet('/categories').reply(
      200,
      success([
        {
          categoryId: 'custom_9f2b',
          categoryName: 'Thú cưng',
          nameVi: 'Thú cưng',
          nameEn: null,
          type: 'expense',
          isMandatory: false,
          expenseClass: 'wants',
          icon: 'pets',
          color: '#FF00AA',
          sortOrder: null,
        },
      ]),
    );

    const [row] = await getCustomerCategories('cust-1');

    expect(row).toEqual(
      expect.objectContaining({
        categoryId: 'custom_9f2b',
        nameVi: 'Thú cưng',
        color: '#FF00AA',
        icon: 'pets',
        bucketId: 'wants',
      }),
    );
  });

  it('falls back to categoryName when nameVi is null, and leaves absent visuals undefined', async () => {
    mock.onGet('/categories').reply(
      200,
      success([
        {
          categoryId: 'custom_plain',
          categoryName: 'Không dấu',
          nameVi: null,
          nameEn: null,
          type: 'expense',
          isMandatory: false,
          expenseClass: 'needs',
          icon: null,
          color: null,
          sortOrder: null,
        },
      ]),
    );

    const [row] = await getCustomerCategories('cust-1');

    expect(row.nameVi).toBe('Không dấu');
    expect(row.color).toBeUndefined();
    expect(row.icon).toBeUndefined();
  });
});
