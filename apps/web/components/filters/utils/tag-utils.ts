import { Tag } from "@/lib/content";

/**
 * Expand visible tags to include selected tags and remove duplicates
 * @param visibleTags - Currently visible tags
 * @param allTags - All available tags
 * @param selectedTagIds - Array of selected tag IDs
 * @returns Expanded and deduplicated array of tags
 */
export function expandVisibleTagsWithSelected(
  visibleTags: Tag[],
  allTags: Tag[],
  selectedTagIds: string[]
): Tag[] {
  // Get selected tag objects
  const selectedTagObjs = allTags.filter(tag => selectedTagIds.includes(tag.id));
  
  // Add any selected tags not already in visibleTags
  const expandedTags = [
    ...selectedTagObjs.filter(tag => !visibleTags.some(t => t.id === tag.id)),
    ...visibleTags
  ];
  
  // Remove duplicates by keeping first occurrence of each tag ID
  return expandedTags.filter((tag, idx, arr) => 
    arr.findIndex(t => t.id === tag.id) === idx
  );
}

/**
 * Order tags with selected tags first
 * @param tags - Array of tags to order
 * @param selectedTagIds - Array of selected tag IDs
 * @returns Ordered array with selected tags first
 */
export function orderTagsWithSelectedFirst(
  tags: Tag[],
  selectedTagIds: string[]
): Tag[] {
  return [
    ...tags.filter(tag => selectedTagIds.includes(tag.id)),
    ...tags.filter(tag => !selectedTagIds.includes(tag.id)),
  ];
} 