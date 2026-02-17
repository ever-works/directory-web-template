import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '../drizzle';
import { comments, clientProfiles, type NewComment } from '../schema';
import type { CommentWithUser } from './types';
import { getItemIdFromSlug } from './item.queries';

/**
 * Create a new comment
 * @param data - Comment data with itemId as slug
 * @returns Created comment
 */
export async function createComment(data: NewComment) {
  // Ensure itemId is properly normalized (it should be a slug)
  const normalizedData = {
    ...data,
    itemId: getItemIdFromSlug(data.itemId)
  };
  return (await db.insert(comments).values(normalizedData).returning())[0];
}

/**
 * Get comments by item slug with user information
 * @param itemSlug - Item slug
 * @returns Array of comments with user details
 */
export async function getCommentsByItemId(itemSlug: string): Promise<CommentWithUser[]> {
  const itemId = getItemIdFromSlug(itemSlug);
  return db
    .select({
      id: comments.id,
      content: comments.content,
      rating: comments.rating,
      userId: comments.userId,
      itemId: comments.itemId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      user: {
        id: clientProfiles.id,
        name: clientProfiles.name,
        email: clientProfiles.email,
        image: clientProfiles.avatar
      }
    })
    .from(comments)
    .innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
    .where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
    .orderBy(desc(comments.createdAt));
}

/**
 * Get comment by ID
 * @param id - Comment ID
 * @returns Comment or undefined
 */
export async function getCommentById(id: string) {
  return (await db.select().from(comments).where(eq(comments.id, id)).limit(1))[0];
}

/**
 * Get comment by ID with user information
 * @param id - Comment ID
 * @returns Comment with user details or undefined
 */
export async function getCommentWithUserById(id: string): Promise<CommentWithUser | undefined> {
  const results = await db
    .select({
      id: comments.id,
      content: comments.content,
      rating: comments.rating,
      userId: comments.userId,
      itemId: comments.itemId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      user: {
        id: clientProfiles.id,
        name: clientProfiles.name,
        email: clientProfiles.email,
        image: clientProfiles.avatar
      }
    })
    .from(comments)
    .innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
    .where(eq(comments.id, id))
    .limit(1);
  return results[0];
}

/**
 * Update comment content and/or rating
 * @param id - Comment ID
 * @param data - Updated content and/or rating
 * @returns Updated comment
 */
export async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
) {
  const now = new Date();
  const [comment] = await db
    .update(comments)
    .set({
      ...(data.content !== undefined && { content: data.content }),
      ...(data.rating !== undefined && { rating: data.rating }),
      updatedAt: now,
      editedAt: now
    })
    .where(eq(comments.id, id))
    .returning();

  return comment;
}

/**
 * Update comment rating
 * @param id - Comment ID
 * @param rating - New rating
 * @returns Updated comment
 */
export async function updateCommentRating(id: string, rating: number) {
  return (await db.update(comments).set({ rating }).where(eq(comments.id, id)).returning())[0];
}

/**
 * Soft delete a comment
 * @param id - Comment ID
 * @returns Deleted comment
 */
export async function deleteComment(id: string) {
  const [comment] = await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();

  return comment;
}
