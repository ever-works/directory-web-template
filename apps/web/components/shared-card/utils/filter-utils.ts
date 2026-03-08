import type { ItemData, Tag } from "@/lib/content";
import type { TagId } from "@/components/filters/types";

/**
 * Get tag ID from tag object or string
 */
export const getTagId = (tag: string | Tag): string =>
  typeof tag === "string" ? tag : tag.id;

/**
 * Get tag name by tag ID
 */
export const getTagName = (tagId: string, tags: Tag[]): string | null =>
  tags.find((tag) => tag.id === tagId)?.name || null;

/**
 * Filter items by search term
 * Searches in item name and description
 */
export function filterBySearch(items: ItemData[], searchTerm: string): ItemData[] {
  if (!searchTerm.trim()) return items;

  const searchLower = searchTerm.toLowerCase().trim();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
  );
}

/**
 * Filter items by multiple tags (OR logic)
 * Returns items that have at least one of the selected tags
 */
export function filterByTags(items: ItemData[], selectedTags: TagId[]): ItemData[] {
  if (selectedTags.length === 0) return items;

  return items.filter((item) => {
    if (!item.tags?.length) return false;
    return selectedTags.some((selectedTagId) =>
      item.tags.some((itemTag) => getTagId(itemTag) === selectedTagId)
    );
  });
}

/**
 * Filter items by single tag
 */
export function filterByTag(items: ItemData[], selectedTag: TagId | null): ItemData[] {
  if (!selectedTag) return items;

  return items.filter((item) => {
    if (!item.tags?.length) return false;
    return item.tags.some((itemTag) => getTagId(itemTag) === selectedTag);
  });
}

/**
 * Apply all filters to items
 */
export function applyFilters(
  items: ItemData[],
  searchTerm: string,
  selectedTags: TagId[],
  enableSearch: boolean,
  enableTagFilter: boolean
): ItemData[] {
  let filtered = items;

  if (enableSearch) {
    filtered = filterBySearch(filtered, searchTerm);
  }

  if (enableTagFilter) {
    filtered = filterByTags(filtered, selectedTags);
  }

  return filtered;
}
