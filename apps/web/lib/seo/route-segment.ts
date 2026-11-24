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
 * The tag a dynamic route's `params.tag` names, whether the framework hands the
 * segment over percent-encoded (`100%25`, `Open%20Source`) or already decoded
 * (`100%`). The value is looked up as given FIRST and decoded only if that finds
 * nothing, so a tag whose own text contains an escape-looking run (`a%20b`) is
 * never decoded a second time into a different tag, and a lone `%` never throws.
 */
export function findTagByParam<T extends TagLike>(tags: readonly T[], param: string): T | undefined {
	const asGiven = findTagBySegment(tags, param);
	if (asGiven) return asGiven;
	const decoded = decodeSegment(param);
	return decoded !== null && decoded !== param ? findTagBySegment(tags, decoded) : undefined;
}
