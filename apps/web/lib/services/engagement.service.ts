import { getEngagementMetricsPerItem, ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';
import { ItemData } from '@/lib/content';

/**
 * Extended ItemData with engagement metrics for true popularity sorting
 */
export interface ItemWithEngagement extends ItemData {
  engagement?: ItemEngagementMetrics;
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
 * Calculate TRUE popularity score using real engagement metrics
 * 
 * Uses LOGARITHMIC SCALING for performance at scale (1M+ users)
 * This ensures items continue to differentiate even with millions of interactions
 * 
 * Scoring weights (approximate max at 1M interactions):
 * - Featured: 10,000 points (base boost)
 * - Views: ~6,000 points (weight: 1000, scales with log10)
 * - Votes: ~7,200 points (weight: 1200, higher for active engagement)
 * - Rating: 0-2,500 points (linear, already bounded 0-5 stars)
 * - Favorites: ~6,600 points (weight: 1100, shows strong interest)
 * - Comments: ~6,000 points (weight: 1000, indicates discussion)
 * - Recency: 0-1,750 points (decay over time)
 */
export function calculatePopularityScore(item: ItemWithEngagement): number {
  let score = 0;

  // Featured items get massive boost
  if (item.featured) {
    score += 10000;
  }

  const engagement = item.engagement;
  if (engagement) {
    // Views - logarithmic scale, weight 1000
    // 10 views = 1000, 1000 views = 3000, 1M views = 6000
    score += logScale(engagement.views, 1000);

    // Votes - logarithmic scale, weight 1200 (higher for active engagement)
    // Only count positive net votes
    // 10 net votes = 1200, 1000 votes = 3600, 1M votes = 7200
    score += logScale(Math.max(engagement.votes, 0), 1200);

    // Average rating - linear (already bounded 0-5 stars)
    // 500 points per star = max 2500
    score += engagement.avgRating * 500;

    // Favorites - logarithmic scale, weight 1100
    // 10 favorites = 1100, 1000 = 3300, 1M = 6600
    score += logScale(engagement.favorites, 1100);

    // Comments - logarithmic scale, weight 1000
    // 10 comments = 1000, 1000 = 3000, 1M = 6000
    score += logScale(engagement.comments, 1000);
  }

  // Recency score - newer items get more visibility
  const now = Date.now();
  const itemTime = item.updatedAt instanceof Date 
    ? item.updatedAt.getTime() 
    : new Date(item.updatedAt).getTime();
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
 * Sort items by true popularity using engagement metrics
 */
export function sortByPopularity(a: ItemWithEngagement, b: ItemWithEngagement): number {
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
 * Enrich items with engagement metrics from the database
 * 
 * @param items - Array of items to enrich
 * @returns Items with engagement metrics attached
 */
export async function enrichItemsWithEngagement(
  items: ItemData[]
): Promise<ItemWithEngagement[]> {
  if (items.length === 0) return [];

  const slugs = items.map(item => item.slug);
  const metricsMap = await getEngagementMetricsPerItem(slugs);

  return items.map(item => ({
    ...item,
    engagement: metricsMap.get(item.slug),
  }));
}
