import { reactive } from 'vue';

export const PAGE_SIZE = 9;

/**
 * Composable for 3-column item-grid pagination used in Clothing and Props panels.
 * Each clothing/prop slot gets its own page cursor keyed by a string key.
 */
export function usePagination() {
  const pages = reactive<Record<string, number>>({});

  const pageCount = (total: number): number =>
    Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** Returns the flat indices (0-based) visible on the current page for `total` items. */
  const pagedItems = (key: string, total: number): number[] => {
    const offset = (pages[key] ?? 0) * PAGE_SIZE;
    const count  = Math.min(PAGE_SIZE, total - offset);
    return Array.from({ length: count }, (_, i) => offset + i);
  };

  const prevPage = (key: string): void => {
    pages[key] = Math.max(0, (pages[key] ?? 0) - 1);
  };

  const nextPage = (key: string, total: number): void => {
    pages[key] = Math.min(pageCount(total) - 1, (pages[key] ?? 0) + 1);
  };

  return { pages, pageCount, pagedItems, prevPage, nextPage };
}
