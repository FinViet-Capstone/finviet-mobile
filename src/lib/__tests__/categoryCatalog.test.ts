import { buildCategoryCatalog, isCustomCategoryId } from '@/lib/categoryCatalog';
import { getCategoryById } from '@/constants/categories';
import type { CustomerCategory } from '@/types/category';

/**
 * The reported bug: a customer creates their own label, it saves, it shows in
 * the bucket editor — and never appears when they add a transaction, because
 * the picker read the compiled constant instead of the backend's catalog.
 */

function row(over: Partial<CustomerCategory> & { categoryId: string }): CustomerCategory {
  return {
    id: over.categoryId,
    customerId: 'cust-1',
    bucketId: 'needs',
    source: 'system',
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

describe('isCustomCategoryId', () => {
  it('recognizes the backend prefix for a customer-created category', () => {
    expect(isCustomCategoryId('custom_9f2b')).toBe(true);
    expect(isCustomCategoryId('cat_food')).toBe(false);
  });
});

describe('buildCategoryCatalog', () => {
  it('includes a customer-created category, using the name and colour the backend sent', () => {
    const catalog = buildCategoryCatalog([
      row({ categoryId: 'cat_food' }),
      row({
        categoryId: 'custom_pet',
        nameVi: 'Thú cưng',
        color: '#FF00AA',
        bucketId: 'wants',
      }),
    ]);

    const pet = catalog.get('custom_pet');
    expect(pet).toEqual(
      expect.objectContaining({
        id: 'custom_pet',
        nameVi: 'Thú cưng',
        color: '#FF00AA',
        bucket: 'wants',
        isCustom: true,
      }),
    );
    expect(catalog.list.map((c) => c.id)).toContain('custom_pet');
  });

  it('names a category the FE constant has never heard of instead of printing its raw id', () => {
    // `cat_vehicle` exists in the deployed database but in neither the FE
    // constant nor the backend's seed migration — an admin added it later.
    const catalog = buildCategoryCatalog([
      row({ categoryId: 'cat_vehicle', nameVi: 'Xe cộ', color: '#123456', bucketId: 'wants' }),
    ]);

    expect(catalog.get('cat_vehicle')).toEqual(
      expect.objectContaining({ nameVi: 'Xe cộ', color: '#123456', isCustom: false }),
    );
  });

  it('keeps the FE constant as the visual source for an id it does know', () => {
    // Backend and constant disagree on colour for the seeded categories; the
    // constant wins so nothing in the app shifts appearance.
    const sysFood = getCategoryById('cat_food')!;
    const catalog = buildCategoryCatalog([
      row({ categoryId: 'cat_food', nameVi: 'Ăn uống (BE)', color: '#4EDEA3' }),
    ]);

    expect(catalog.get('cat_food')?.nameVi).toBe(sysFood.nameVi);
    expect(catalog.get('cat_food')?.color).toBe(sysFood.color);
  });

  it("takes each category's bucket from the customer's own placement, not the system default", () => {
    // cat_food defaults to needs; this customer dragged it into wants.
    expect(getCategoryById('cat_food')?.defaultBucket).toBe('needs');
    const catalog = buildCategoryCatalog([row({ categoryId: 'cat_food', bucketId: 'wants' })]);
    expect(catalog.get('cat_food')?.bucket).toBe('wants');
  });

  it('omits the auto-only and placeholder categories from the pickable list', () => {
    const catalog = buildCategoryCatalog([
      row({ categoryId: 'cat_savings_goal', bucketId: 'savings' }),
      row({ categoryId: 'cat_uncategorized' }),
      row({ categoryId: 'cat_food' }),
    ]);
    expect(catalog.list.map((c) => c.id)).toEqual(['cat_food']);
  });

  it('orders known categories by the system sort order and puts unknown ones last', () => {
    const catalog = buildCategoryCatalog([
      row({ categoryId: 'custom_pet', nameVi: 'Thú cưng' }),
      row({ categoryId: 'cat_transport' }), // sortOrder 3
      row({ categoryId: 'cat_food' }), // sortOrder 1
    ]);
    expect(catalog.list.map((c) => c.id)).toEqual(['cat_food', 'cat_transport', 'custom_pet']);
  });

  it('returns undefined rather than a guess for an id the catalog has no row for', () => {
    const catalog = buildCategoryCatalog([row({ categoryId: 'cat_food' })]);
    expect(catalog.get('custom_gone')).toBeUndefined();
    expect(catalog.get(null)).toBeUndefined();
  });

  it('still resolves the categories it deliberately keeps out of the pickable list', () => {
    // Income has no per-customer set, and cat_savings_goal is auto-assigned —
    // but transactions carry both, and their rows still have to render.
    const catalog = buildCategoryCatalog([row({ categoryId: 'cat_food' })]);

    expect(catalog.get('cat_salary')?.nameVi).toBe(getCategoryById('cat_salary')!.nameVi);
    expect(catalog.get('cat_savings_goal')?.nameVi).toBe(
      getCategoryById('cat_savings_goal')!.nameVi,
    );
    expect(catalog.list.map((c) => c.id)).toEqual(['cat_food']);
  });

  it('reuses one built catalog per query result, so a long list does not rebuild per row', () => {
    const rows = [row({ categoryId: 'cat_food' })];
    expect(buildCategoryCatalog(rows)).toBe(buildCategoryCatalog(rows));
  });

  it('still resolves system categories before the query has loaded', () => {
    // Otherwise every already-rendered row would flash the unknown-id fallback
    // on a cold start. Only the pickable list is empty until data arrives.
    const catalog = buildCategoryCatalog(undefined);
    expect(catalog.list).toEqual([]);
    expect(catalog.get('cat_food')?.nameVi).toBe(getCategoryById('cat_food')!.nameVi);
    expect(catalog.get('custom_pet')).toBeUndefined();
  });
});
