import { useMemo } from "react";
import type { ItemData } from "@/lib/content";
import type { SortOption } from "@/components/filters/types";
import { sortItems } from "../utils/sort-utils";

interface UseItemSortingOptions {
  enableSorting: boolean;
}

/**
 * Hook to sort items based on sort option
 * Memoized for performance
 */
export function useItemSorting(
  items: ItemData[],
  sortBy: SortOption,
  options: UseItemSortingOptions
): ItemData[] {
  return useMemo(() => {
    if (!options.enableSorting) return items;
    return sortItems(items, sortBy);
  }, [items, sortBy, options.enableSorting]);
}
