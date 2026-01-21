import { and, eq, sql, inArray } from 'drizzle-orm';
import { db } from '../drizzle';
import { votes, type InsertVote } from '../schema';
import { getItemIdFromSlug } from './item.queries';

/**
 * Create a new vote
 * @param vote - Vote data with itemId as slug
 * @returns Created vote
 */
export async function createVote(vote: InsertVote) {
  // Ensure itemId is properly normalized (it should be a slug)
  const normalizedVote = {
    ...vote,
    itemId: getItemIdFromSlug(vote.itemId)
  };
  const [createdVote] = await db.insert(votes).values(normalizedVote).returning();
  return createdVote;
}

/**
 * Get vote by user ID and item slug
 * @param userId - User ID
 * @param itemSlug - Item slug
 * @returns Vote array (empty if not found)
 */
export async function getVoteByUserIdAndItemId(userId: string, itemSlug: string) {
  const itemId = getItemIdFromSlug(itemSlug);
  return db
    .select()
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.itemId, itemId)))
    .limit(1);
}

/**
 * Delete a vote
 * @param voteId - Vote ID to delete
 */
export async function deleteVote(voteId: string) {
  return db.delete(votes).where(eq(votes.id, voteId));
}

/**
 * Get items sorted by vote count
 * @param limit - Number of items to return
 * @param offset - Offset for pagination
 * @returns Items with vote counts
 */
export async function getItemsSortedByVotes(limit: number = 10, offset: number = 0) {
  const itemsWithVotes = await db
    .select({
      itemId: votes.itemId,
      voteCount: sql<number>`count(${votes.id})`.as('vote_count')
    })
    .from(votes)
    .groupBy(votes.itemId)
    .orderBy(sql`vote_count DESC`)
    .limit(limit)
    .offset(offset);

  return itemsWithVotes;
}

/**
 * Get the net vote score for an item (upvotes - downvotes)
 * @param itemSlug - The item slug to get the vote score for
 * @returns Net vote score (positive = more upvotes, negative = more downvotes, 0 = equal or no votes)
 */
export async function getVoteCountForItem(itemSlug: string): Promise<number> {
  const itemId = getItemIdFromSlug(itemSlug);
  const [result] = await db
    .select({
      netScore: sql<number>`
        SUM(CASE
          WHEN vote_type = 'upvote' THEN 1
          WHEN vote_type = 'downvote' THEN -1
          ELSE 0
        END)
      `.as('netScore')
    })
    .from(votes)
    .where(eq(votes.itemId, itemId));

  return Number(result?.netScore ?? 0);
}

/**
 * Get net vote scores for multiple items (upvotes - downvotes)
 * @param itemSlugs - Array of item slugs
 * @returns Map of itemSlug to net vote score
 */
export async function getVotesPerItem(itemSlugs: string[]): Promise<Map<string, number>> {
  if (itemSlugs.length === 0) return new Map();

  const voteCounts = await db
    .select({
      itemId: votes.itemId,
      netScore: sql<number>`
        SUM(CASE
          WHEN vote_type = 'upvote' THEN 1
          WHEN vote_type = 'downvote' THEN -1
          ELSE 0
        END)
      `.as('netScore')
    })
    .from(votes)
    .where(inArray(votes.itemId, itemSlugs))
    .groupBy(votes.itemId);

  return new Map(voteCounts.map(v => [v.itemId, Number(v.netScore ?? 0)]));
}
