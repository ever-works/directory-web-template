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
	// The exact id first: an EARLIER tag whose display name equals a later
	// tag's id must not shadow that tag (the page and canonical would name the
	// wrong one).
	const byId = tags.find((tag) => tag.id === segment);
	if (byId) return byId;
	const lower = segment.toLowerCase();
	return tags.find((tag) => typeof tag.name === 'string' && tag.name.toLowerCase() === lower);
}

/**
 * The tag a dynamic route's `params.tag` names. The value is looked up as given
 * FIRST and decoded only if that finds nothing, so a lone `%` never throws.
 *
 * Through the real route, `/tags/[tag]` gets the segment still percent-encoded
 * (`Open%20Source`, `a%2Fb`), but only after next-intl's middleware has
 * `decodeURI`d the path once: `/tags/a%2520b` arrives as `a%20b`, the same value
 * `/tags/a%20b` gives. So the as-given lookup lets a literal tag `a%20b` be
 * reached, and if a tag `a b` also exists, the literal one wins. A tag id with a
 * lone `%` (`/tags/100%25`) never reaches the page: Next answers HTTP 400.
 */
export function findTagByParam<T extends TagLike>(tags: readonly T[], param: string): T | undefined {
	const asGiven = findTagBySegment(tags, param);
	if (asGiven) return asGiven;
	const decoded = decodeSegment(param);
	return decoded !== null && decoded !== param ? findTagBySegment(tags, decoded) : undefined;
}
