/** Longest comment the API stores, in characters after trimming (the comment textarea caps at the same length). */
export const COMMENT_CONTENT_MAX_LENGTH = 1000;
export const COMMENT_RATING_MIN = 1;
export const COMMENT_RATING_MAX = 5;

export interface CommentInput {
	/** Trimmed, 1 to {@link COMMENT_CONTENT_MAX_LENGTH} characters. */
	content: string;
	/** Integer from {@link COMMENT_RATING_MIN} to {@link COMMENT_RATING_MAX} (the `comments.rating` column is an integer). */
	rating: number;
}

export type CommentInputResult<T> = { ok: true; value: T } | { ok: false; error: string };

type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

function checkContent(content: unknown): FieldResult<string> {
	if (content === undefined || content === null) {
		return { ok: false, error: 'Content is required' };
	}
	if (typeof content !== 'string') {
		return { ok: false, error: 'Content must be a string' };
	}
	const trimmed = content.trim();
	if (trimmed.length === 0 || trimmed.length > COMMENT_CONTENT_MAX_LENGTH) {
		return { ok: false, error: `Content must be between 1 and ${COMMENT_CONTENT_MAX_LENGTH} characters` };
	}
	return { ok: true, value: trimmed };
}

function checkRating(rating: unknown): FieldResult<number> {
	if (rating === undefined || rating === null) {
		return { ok: false, error: 'Rating is required' };
	}
	if (typeof rating !== 'number' || !Number.isInteger(rating)) {
		return { ok: false, error: 'Rating must be an integer' };
	}
	if (rating < COMMENT_RATING_MIN || rating > COMMENT_RATING_MAX) {
		return { ok: false, error: `Rating must be between ${COMMENT_RATING_MIN} and ${COMMENT_RATING_MAX}` };
	}
	return { ok: true, value: rating };
}

/**
 * Validates the JSON body of a comment create (`POST /api/items/{slug}/comments`) or edit
 * (`PUT /api/items/{slug}/comments/{commentId}`, with `{ partial: true }`).
 *
 * Without `partial`, both `content` and `rating` are required. With it, a field that is
 * absent (`undefined`) is left out of the result, but at least one must be present.
 * Returns the trimmed content and the rating, or the message for a 400 response.
 */
export function validateCommentInput(body: unknown): CommentInputResult<CommentInput>;
export function validateCommentInput(
	body: unknown,
	options: { partial: true }
): CommentInputResult<Partial<CommentInput>>;
export function validateCommentInput(
	body: unknown,
	options: { partial?: boolean } = {}
): CommentInputResult<Partial<CommentInput>> {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return { ok: false, error: 'Request body must be a JSON object' };
	}
	const { content, rating } = body as Record<string, unknown>;
	const partial = options.partial === true;

	if (partial && content === undefined && rating === undefined) {
		return { ok: false, error: 'At least one of content or rating must be provided' };
	}

	const value: Partial<CommentInput> = {};
	if (!partial || content !== undefined) {
		const checked = checkContent(content);
		if (!checked.ok) return checked;
		value.content = checked.value;
	}
	if (!partial || rating !== undefined) {
		const checked = checkRating(rating);
		if (!checked.ok) return checked;
		value.rating = checked.value;
	}
	return { ok: true, value };
}
