import type { ItemData } from "@/lib/content";
import type { SortOption } from "@/components/filters/types";
import type { ItemEngagementMetrics } from "@/lib/db/queries/engagement.queries";

export const SORT_OPTIONS = {
  POPULARITY: "popularity",
  NAME_ASC: "name-asc",
  NAME_DESC: "name-desc",
  DATE_DESC: "date-desc",
  DATE_ASC: "date-asc",
} as const;

/**
 * Extended ItemData with optional engagement metrics for popularity sorting
 */
export interface ItemWithEngagement extends ItemData {
  engagement?: ItemEngagementMetrics;
}

/**
 * Helper function to safely get timestamp from Date or string
 * Handles both Date objects and date strings (from cached data)
 */
function getTime(date: Date | string): number {
  if (date instanceof Date) {
    return date.getTime();
  }
  return new Date(date).getTime();
}

/**
 * Sort items by name (ascending)
 */
function sortByNameAsc(a: ItemData, b: ItemData): number {
  return a.name.localeCompare(b.name);
}

/**
 * Sort items by name (descending)
 */
function sortByNameDesc(a: ItemData, b: ItemData): number {
  return b.name.localeCompare(a.name);
}

/**
 * Sort items by date (descending - newest first)
 */
function sortByDateDesc(a: ItemData, b: ItemData): number {
  return getTime(b.updatedAt) - getTime(a.updatedAt);
}

/**
 * Sort items by date (ascending - oldest first)
 */
function sortByDateAsc(a: ItemData, b: ItemData): number {
  return getTime(a.updatedAt) - getTime(b.updatedAt);
}

/**
 * Logarithmic scaling function for engagement metrics
 * Uses log10 to handle large numbers gracefully (1M+ users)
 * 
 * Examples:
 *   1 → 0, 10 → 1000, 100 → 2000, 1000 → 3000, 1M → 6000
 * 
 * @param value - Raw metric value
 * @param weight - Multiplier for importance (default 1000)
 */
function logScale(value: number, weight: number = 1000): number {
  if (value <= 0) return 0;
  return Math.log10(value + 1) * weight;
}

/**
 * Calculate popularity score for an item
 * 
 * Uses LOGARITHMIC SCALING for performance at scale (1M+ users)
 * This ensures items continue to differentiate even with millions of interactions
 * 
 * When engagement data IS available:
 * - Views: ~6,000 points max (weight: 1000, scales with log10)
 * - Votes: ~7,200 points max (weight: 1200, higher for active engagement)
 * - Rating: 0-2,500 points (linear, already bounded 0-5 stars)
 * - Favorites: ~6,600 points max (weight: 1100, shows strong interest)
 * - Comments: ~6,000 points max (weight: 1000, indicates discussion)
 * 
 * When engagement data is NOT available (fallback heuristic):
 * - Featured status, recency, tags, icon, promo code
 */
function calculatePopularityScore(item: ItemWithEngagement): number {
  let score = 0;

  // Featured items get a massive boost (10000 points)
  if (item.featured) {
    score += 10000;
  }

  // Check if we have real engagement metrics
  const engagement = item.engagement;
  if (engagement) {
    // TRUE POPULARITY: Use real engagement data with logarithmic scaling
    
    // Views - logarithmic scale, weight 1000
    // 10 views = 1000, 1000 views = 3000, 1M views = 6000
    score += logScale(engagement.views, 1000);

    // Votes - logarithmic scale, weight 1200 (higher for active engagement)
    // Only count positive net votes
    score += logScale(Math.max(engagement.votes, 0), 1200);

    // Average rating - linear (already bounded 0-5 stars)
    // 500 points per star = max 2500
    score += engagement.avgRating * 500;

    // Favorites - logarithmic scale, weight 1100
    score += logScale(engagement.favorites, 1100);

    // Comments - logarithmic scale, weight 1000
    score += logScale(engagement.comments, 1000);
  } else {
    // FALLBACK HEURISTIC: Use content-based indicators
    
    // Tag count: items with more tags might be more comprehensive
    if (Array.isArray(item.tags)) {
      score += Math.min(item.tags.length * 10, 100); // Cap at 100 points
    }

    // Name quality: shorter, cleaner names might indicate more polished items
    const nameLength = item.name.length;
    if (nameLength < 20) {
      score += 50;
    } else if (nameLength < 40) {
      score += 25;
    }

    // Items with icons are likely more polished
    if (item.icon_url) {
      score += 50;
    }

    // Items with promo codes might be actively promoted
    if (item.promo_code) {
      score += 75;
    }
  }

  // Recency score: items updated more recently get higher scores
  // Use a decay function where items lose points over time
  const now = Date.now();
  const itemTime = getTime(item.updatedAt);
  const ageInDays = (now - itemTime) / (1000 * 60 * 60 * 24);
  
  // Items within last 30 days get 0-1000 points (linear decay)
  // Items within last 90 days get 0-500 additional points
  // Items older than 180 days get no recency points
  if (ageInDays < 30) {
    score += 1000 * (1 - ageInDays / 30);
  } else if (ageInDays < 90) {
    score += 500 * (1 - (ageInDays - 30) / 60);
  } else if (ageInDays < 180) {
    score += 250 * (1 - (ageInDays - 90) / 90);
  }

  return score;
}

/**
 * Sort items by popularity (comprehensive scoring algorithm)
 * Supports both items with engagement data (true popularity) and without (heuristic)
 */
function sortByPopularity(a: ItemWithEngagement, b: ItemWithEngagement): number {
  const scoreA = calculatePopularityScore(a);
  const scoreB = calculatePopularityScore(b);
  
  // Higher score = more popular = comes first
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }
  
  // If scores are equal, fall back to alphabetical by name
  return a.name.localeCompare(b.name);
}

/**
 * Sort items based on sort option
 * Supports items with or without engagement data
 */
export function sortItems<T extends ItemData>(items: T[], sortBy: SortOption): T[] {
  const sorted = [...items];

  switch (sortBy) {
    case SORT_OPTIONS.NAME_ASC:
      return sorted.sort(sortByNameAsc);
    case SORT_OPTIONS.NAME_DESC:
      return sorted.sort(sortByNameDesc);
    case SORT_OPTIONS.DATE_DESC:
      return sorted.sort(sortByDateDesc);
    case SORT_OPTIONS.DATE_ASC:
      return sorted.sort(sortByDateAsc);
    case SORT_OPTIONS.POPULARITY:
    default:
      return sorted.sort(sortByPopularity);
  }
}

/**
 * Export the popularity score calculation for external use
 * (e.g., for debugging or showing popularity metrics in UI)
 */
export { calculatePopularityScore };

/**
 * Debug helper: Get items with their popularity scores
 * Use this to verify sorting is working correctly
 */
export function getItemsWithScores<T extends ItemData>(items: T[]): Array<T & { popularityScore: number }> {
  return items.map(item => ({
    ...item,
    popularityScore: calculatePopularityScore(item as ItemWithEngagement)
  }));
}
