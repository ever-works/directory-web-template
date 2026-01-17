import type { ItemData } from "@/lib/content";
import type { SortOption } from "@/components/filters/types";

export const SORT_OPTIONS = {
  POPULARITY: "popularity",
  NAME_ASC: "name-asc",
  NAME_DESC: "name-desc",
  DATE_DESC: "date-desc",
  DATE_ASC: "date-asc",
} as const;

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
 * Calculate popularity score for an item
 * 
 * NOTE: This is a CLIENT-SIDE HEURISTIC approach. For TRUE popularity based on actual
 * engagement metrics (views, votes, ratings, favorites, comments), the server should:
 * 1. Query engagement data from the database (item_views, votes, comments, favorites tables)
 * 2. Attach this data to ItemData before sending to the client
 * 3. Use those real metrics in this scoring function
 * 
 * Current heuristic combines multiple factors:
 * - Featured status (highest priority)
 * - Recency (newer items get higher scores)
 * - Item quality indicators (icon, promo code, tags, name length)
 * 
 * TODO: Enhance by fetching real engagement metrics from:
 * - getViewsPerItem() - from lib/db/queries/item-view.queries.ts
 * - getVoteCountForItem() - from lib/db/queries/vote.queries.ts
 * - Rating data - from comments table
 * - getFavoriteCount() - from favorites table
 */
function calculatePopularityScore(item: ItemData): number {
  let score = 0;

  // Featured items get a massive boost (10000 points)
  if (item.featured) {
    score += 10000;
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

  return score;
}

/**
 * Sort items by popularity (comprehensive scoring algorithm)
 */
function sortByPopularity(a: ItemData, b: ItemData): number {
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
 */
export function sortItems(items: ItemData[], sortBy: SortOption): ItemData[] {
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
 * Extended ItemData with engagement metrics for proper popularity sorting
 * Use this interface when you fetch items with their engagement data from the database
 */
export interface ItemWithEngagement extends ItemData {
  views?: number;        // From item_views table
  votes?: number;        // Net votes (upvotes - downvotes) from votes table
  rating?: number;       // Average rating from comments
  favorites?: number;    // Count from favorites table
  comments?: number;     // Count from comments table
}

/**
 * Calculate TRUE popularity score using real engagement metrics
 * Use this function when ItemData includes engagement metrics from the database
 * 
 * Scoring weights:
 * - Featured: 10,000 points (base)
 * - Views: 1 point each (capped at 5,000)
 * - Votes: 10 points each (capped at 2,000)
 * - Rating: 500 points per star (capped at 2,500 for 5 stars)
 * - Favorites: 25 points each (capped at 2,500)
 * - Comments: 50 points each (capped at 2,500)
 * - Recency: 0-1,750 points (decay over time)
 */
export function calculateEngagementScore(item: ItemWithEngagement): number {
  let score = 0;

  // Featured items get massive boost
  if (item.featured) {
    score += 10000;
  }

  // Views - 1 point each, capped at 5000
  if (item.views) {
    score += Math.min(item.views, 5000);
  }

  // Votes (upvotes - downvotes) - 10 points each, capped at 2000
  if (item.votes !== undefined) {
    score += Math.min(Math.max(item.votes * 10, 0), 2000);
  }

  // Average rating - 500 points per star (0-5 stars = 0-2500 points)
  if (item.rating) {
    score += Math.min(item.rating * 500, 2500);
  }

  // Favorites - 25 points each, capped at 2500
  if (item.favorites) {
    score += Math.min(item.favorites * 25, 2500);
  }

  // Comments - 50 points each, capped at 2500
  if (item.comments) {
    score += Math.min(item.comments * 50, 2500);
  }

  // Recency score (same as heuristic version)
  const now = Date.now();
  const itemTime = getTime(item.updatedAt);
  const ageInDays = (now - itemTime) / (1000 * 60 * 60 * 24);
  
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
 * Sort items by true popularity using engagement metrics
 * Use this when items include views, votes, rating, favorites, comments
 */
export function sortByEngagement(a: ItemWithEngagement, b: ItemWithEngagement): number {
  const scoreA = calculateEngagementScore(a);
  const scoreB = calculateEngagementScore(b);
  
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }
  
  return a.name.localeCompare(b.name);
}
