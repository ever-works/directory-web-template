/**
 * Links from an item page to its tag pages.
 *
 * Kept free of runtime imports so the unit tests can load it directly.
 */

/** A tag as it appears in an item's `tags` field: a plain string, or `{ id, name }`. */
export type ItemTagValue = string | { id?: string | null; name?: string | null } | null | undefined;

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** The text shown for a tag (its name, falling back to its id). Empty when the tag has neither. */
export function tagLabel(tag: ItemTagValue): string {
	if (typeof tag === 'string') return text(tag);
	return text(tag?.name) || text(tag?.id);
}

/**
 * The locale-less path of a tag page: `/tags/<id>`, percent-encoded.
 *
 * The tag route finds a tag by its id, or by its display name in any case, so a
 * plain string works whichever of the two it holds. The segment is encoded so a
 * tag such as `a/b`, `what?` or `100%` stays ONE path segment: unencoded, the `/`
 * and `?` split the URL, a `#` cuts it off, and a lone `%` is malformed and 404s.
 *
 * Returns null when the tag has no usable text, so the caller can skip the link
 * instead of publishing `/tags/`.
 */
export function tagPath(tag: ItemTagValue): string | null {
	const segment = typeof tag === 'string' ? text(tag) : text(tag?.id) || text(tag?.name);
	return segment ? `/tags/${encodeURIComponent(segment)}` : null;
}
