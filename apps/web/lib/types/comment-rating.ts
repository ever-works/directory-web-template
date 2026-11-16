/**
 * Aggregate comment rating of one item, the body of
 * `GET /api/items/{slug}/comments/rating`.
 */
export interface CommentRatingSummary {
  /** Average star rating from 1 to 5, `0` when the item has no ratings. */
  averageRating: number;
  /** Number of ratings the average is built from. */
  totalRatings: number;
}

/** Value `useComments().commentRating` has until the request answers. */
export const EMPTY_COMMENT_RATING: CommentRatingSummary = Object.freeze({
  averageRating: 0,
  totalRatings: 0,
});
