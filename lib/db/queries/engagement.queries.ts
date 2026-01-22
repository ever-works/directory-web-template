import { sql, inArray, isNull, count, and } from 'drizzle-orm';
import { db } from '../drizzle';
import { votes, comments, favorites, itemViews } from '../schema';

/**
 * Engagement metrics for popularity scoring
 */
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}

/**
 * Get all engagement metrics for multiple items in a single query batch
 * This is optimized for bulk operations like sorting all items by popularity
 * 
 * @param itemSlugs - Array of item slugs to get metrics for
 * @returns Map of itemSlug to engagement metrics
 */
export async function getEngagementMetricsPerItem(
  itemSlugs: string[]
): Promise<Map<string, ItemEngagementMetrics>> {
  if (itemSlugs.length === 0) return new Map();

  // Run all queries in parallel for better performance
  const [viewsData, votesData, favoritesData, commentsData] = await Promise.all([
    // Views per item
    db
      .select({
        itemId: itemViews.itemId,
        count: count(),
      })
      .from(itemViews)
      .where(inArray(itemViews.itemId, itemSlugs))
      .groupBy(itemViews.itemId),

    // Net votes per item (upvotes - downvotes)
    db
      .select({
        itemId: votes.itemId,
        netScore: sql<number>`
          SUM(CASE
            WHEN vote_type = 'upvote' THEN 1
            WHEN vote_type = 'downvote' THEN -1
            ELSE 0
          END)
        `.as('netScore'),
      })
      .from(votes)
      .where(inArray(votes.itemId, itemSlugs))
      .groupBy(votes.itemId),

    // Favorites per item
    db
      .select({
        itemSlug: favorites.itemSlug,
        count: count(),
      })
      .from(favorites)
      .where(inArray(favorites.itemSlug, itemSlugs))
      .groupBy(favorites.itemSlug),

    // Comments and average rating per item (exclude deleted comments)
    db
      .select({
        itemId: comments.itemId,
        count: count(),
        avgRating: sql<number>`COALESCE(AVG(${comments.rating}), 0)`.as('avgRating'),
      })
      .from(comments)
      .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)))
      .groupBy(comments.itemId),
  ]);

  // Build lookup maps with proper typing
  const viewsMap = new Map<string, number>(
    viewsData.map(v => [v.itemId, Number(v.count)])
  );
  const votesMap = new Map<string, number>(
    votesData.map(v => [v.itemId, Number(v.netScore ?? 0)])
  );
  const favoritesMap = new Map<string, number>(
    favoritesData.map(f => [f.itemSlug, Number(f.count)])
  );
  const commentsMap = new Map<string, { count: number; avgRating: number }>(
    commentsData.map(c => [c.itemId, { count: Number(c.count), avgRating: Number(c.avgRating ?? 0) }])
  );

  // Combine into final metrics map
  const metricsMap = new Map<string, ItemEngagementMetrics>();
  
  for (const slug of itemSlugs) {
    const commentData = commentsMap.get(slug);
    metricsMap.set(slug, {
      views: viewsMap.get(slug) ?? 0,
      votes: votesMap.get(slug) ?? 0,
      favorites: favoritesMap.get(slug) ?? 0,
      comments: commentData?.count ?? 0,
      avgRating: commentData?.avgRating ?? 0,
    });
  }

  return metricsMap;
}

/**
 * Get favorites count per item
 * @param itemSlugs - Array of item slugs
 * @returns Map of itemSlug to favorites count
 */
export async function getFavoritesPerItem(itemSlugs: string[]): Promise<Map<string, number>> {
  if (itemSlugs.length === 0) return new Map();

  const favoriteCounts = await db
    .select({
      itemSlug: favorites.itemSlug,
      count: count(),
    })
    .from(favorites)
    .where(inArray(favorites.itemSlug, itemSlugs))
    .groupBy(favorites.itemSlug);

  return new Map<string, number>(
    favoriteCounts.map(f => [f.itemSlug, Number(f.count)])
  );
}

/**
 * Get comments count and average rating per item
 * @param itemSlugs - Array of item slugs
 * @returns Map of itemSlug to { count, avgRating }
 */
export async function getCommentsPerItem(
  itemSlugs: string[]
): Promise<Map<string, { count: number; avgRating: number }>> {
  if (itemSlugs.length === 0) return new Map();

  const commentCounts = await db
    .select({
      itemId: comments.itemId,
      count: count(),
      avgRating: sql<number>`COALESCE(AVG(${comments.rating}), 0)`.as('avgRating'),
    })
    .from(comments)
    .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)))
    .groupBy(comments.itemId);

  return new Map<string, { count: number; avgRating: number }>(
    commentCounts.map(c => [c.itemId, { count: Number(c.count), avgRating: Number(c.avgRating ?? 0) }])
  );
}
