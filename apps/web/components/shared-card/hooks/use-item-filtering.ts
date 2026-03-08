import { useMemo } from "react";
import type { ItemData } from "@/lib/content";
import type { TagId } from "@/components/filters/types";
import { applyFilters } from "../utils/filter-utils";

interface UseItemFilteringOptions {
  enableSearch: boolean;
  enableTagFilter: boolean;
}

/**
 * Hook to filter items based on search term and tags
 * Memoized for performance
 */
export function useItemFiltering(
  items: ItemData[],
  searchTerm: string,
  selectedTags: TagId[],
  options: UseItemFilteringOptions
): ItemData[] {
  return useMemo(
    () =>
      applyFilters(
        items,
        searchTerm,
        selectedTags,
        options.enableSearch,
        options.enableTagFilter
      ),
    [items, searchTerm, selectedTags, options.enableSearch, options.enableTagFilter]
  );
}
