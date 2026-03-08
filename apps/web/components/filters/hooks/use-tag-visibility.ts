import { useState, useMemo } from 'react';
import { FILTER_CONSTANTS } from '../constants';

/**
 * Custom hook for managing tag visibility
 * Handles showing all tags vs limited tags
 */
export function useTagVisibility(
  tags: any[],
  maxVisibleTags?: number
) {
  const [showAllTags, setShowAllTags] = useState(false);
  
  const MAX_VISIBLE_TAGS = maxVisibleTags || FILTER_CONSTANTS.MAX_VISIBLE_TAGS;
  const hasMoreTags = tags.length > MAX_VISIBLE_TAGS;
  
  const visibleTags = useMemo(() => {
    return showAllTags ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
  }, [tags, showAllTags, MAX_VISIBLE_TAGS]);

  const toggleTagVisibility = () => {
    setShowAllTags(!showAllTags);
  };

  return {
    showAllTags,
    visibleTags,
    hasMoreTags,
    totalTags: tags.length,
    maxVisibleTags: MAX_VISIBLE_TAGS,
    toggleTagVisibility,
    setShowAllTags,
  };
} 