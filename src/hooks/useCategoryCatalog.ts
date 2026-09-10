/**
 * useCategoryCatalog — the customer's real expense category set (system +
 * their own custom labels), resolved to display data.
 *
 * Reads the same useCustomerCategories() query the bucket editor uses, so this
 * adds no request. See lib/categoryCatalog.ts for why the compiled constant in
 * constants/categories.ts is not the catalog.
 */

import { useCustomerCategories } from './useCustomerCategories';
import { buildCategoryCatalog, type CategoryCatalog } from '@/lib/categoryCatalog';

export function useCategoryCatalog(): CategoryCatalog {
  const { data } = useCustomerCategories();
  // buildCategoryCatalog memoizes on the query array's identity, so every card
  // in a list shares one built catalog rather than each holding its own.
  return buildCategoryCatalog(data);
}
