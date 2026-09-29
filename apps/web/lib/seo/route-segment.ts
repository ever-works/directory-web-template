/**
 * Helpers for reading a record out of a dynamic route segment.
 *
 * Kept free of runtime imports so the unit tests can load them directly.
 */

/**
 * A URL path segment, percent-decoded, or null when it is not valid
 * percent-encoding (`%E0%A4%A`). `decodeURIComponent()` throws on those, which
 * turned a malformed URL into an HTTP 500 instead of a 404.
 */
export function decodeSegment(raw: string | null | undefined): string | null {
	if (typeof raw !== 'string') return null;
	try {
		return decodeURIComponent(raw);
	} catch {
		return null;
	}
}

/** The fields a tag is looked up by. */
export interface TagLike {
	id: string;
	name?: string | null;
}

/**
 * The tag a decoded URL segment names: its id exactly, or its display name in
 * any case (`/tags/Open%20Source`). The routes publish the tag under its id,
 * so a page reached by name must still name `/tags/<id>` as canonical.
 */
export function findTagBySegment<T extends TagLike>(tags: readonly T[], segment: string): T | undefined {
	const lower = segment.toLowerCase();
	return tags.find((tag) => tag.id === segment || (typeof tag.name === 'string' && tag.name.toLowerCase() === lower));
}
