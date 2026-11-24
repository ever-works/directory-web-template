/** Longest item slug the favorites API stores, in characters after trimming. */
export const FAVORITE_SLUG_MAX_LENGTH = 200;
/** Longest item name the favorites API stores, in characters after trimming. */
export const FAVORITE_NAME_MAX_LENGTH = 300;
/** Longest icon URL the favorites API stores (the common browser / CDN URL ceiling). */
export const FAVORITE_ICON_URL_MAX_LENGTH = 2048;
/** Longest category label the favorites API stores, in characters after trimming. */
export const FAVORITE_CATEGORY_MAX_LENGTH = 200;

export interface FavoriteInput {
	/** Trimmed, 1 to {@link FAVORITE_SLUG_MAX_LENGTH} characters. */
	itemSlug: string;
	/** Trimmed, 1 to {@link FAVORITE_NAME_MAX_LENGTH} characters. */
	itemName: string;
	/** Trimmed, at most {@link FAVORITE_ICON_URL_MAX_LENGTH} characters; left out when absent, `null` or blank. */
	itemIconUrl?: string;
	/** Trimmed, at most {@link FAVORITE_CATEGORY_MAX_LENGTH} characters; left out when absent, `null` or blank. */
	itemCategory?: string;
}

export type FavoriteInputResult = { ok: true; value: FavoriteInput } | { ok: false; error: string };

type FieldResult = { ok: true; value: string | undefined } | { ok: false; error: string };

function checkText(raw: unknown, label: string, maxLength: number, { required }: { required: boolean }): FieldResult {
	if (raw === undefined || raw === null) {
		return required ? { ok: false, error: `${label} is required` } : { ok: true, value: undefined };
	}
	if (typeof raw !== 'string') {
		return { ok: false, error: `${label} must be a string` };
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return required ? { ok: false, error: `${label} is required` } : { ok: true, value: undefined };
	}
	if (trimmed.length > maxLength) {
		return { ok: false, error: `${label} must be at most ${maxLength} characters` };
	}
	// Postgres `text` cannot hold U+0000, so the insert would fail with a 500
	if (trimmed.includes('\u0000')) {
		return { ok: false, error: `${label} must not contain NUL characters` };
	}
	return { ok: true, value: trimmed };
}

/**
 * Validates the JSON body of `POST /api/favorites`.
 *
 * `itemSlug` and `itemName` are required, non-blank strings; `itemIconUrl` and `itemCategory`
 * are optional. Every string is trimmed and bounded, so a request cannot store an unbounded
 * value or a value Postgres refuses (NUL), which used to surface as a 500.
 * Returns the cleaned values, or the message for a 400 response.
 */
export function validateFavoriteInput(body: unknown): FavoriteInputResult {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return { ok: false, error: 'Request body must be a JSON object' };
	}
	const fields = body as Record<string, unknown>;

	const itemSlug = checkText(fields.itemSlug, 'itemSlug', FAVORITE_SLUG_MAX_LENGTH, { required: true });
	if (!itemSlug.ok) return itemSlug;
	const itemName = checkText(fields.itemName, 'itemName', FAVORITE_NAME_MAX_LENGTH, { required: true });
	if (!itemName.ok) return itemName;
	const itemIconUrl = checkText(fields.itemIconUrl, 'itemIconUrl', FAVORITE_ICON_URL_MAX_LENGTH, {
		required: false
	});
	if (!itemIconUrl.ok) return itemIconUrl;
	const itemCategory = checkText(fields.itemCategory, 'itemCategory', FAVORITE_CATEGORY_MAX_LENGTH, {
		required: false
	});
	if (!itemCategory.ok) return itemCategory;

	const value: FavoriteInput = { itemSlug: itemSlug.value!, itemName: itemName.value! };
	if (itemIconUrl.value !== undefined) value.itemIconUrl = itemIconUrl.value;
	if (itemCategory.value !== undefined) value.itemCategory = itemCategory.value;
	return { ok: true, value };
}
