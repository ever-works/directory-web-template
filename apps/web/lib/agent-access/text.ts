/**
 * Text normalisation shared by the Agent Access builders and the search
 * ranking. Same rules as the minimal template (`packages/agent-api/src/search.ts`
 * there), so ids, slugs and search results match across both templates.
 */

/** Combining diacritical marks (U+0300 to U+036F), stripped after NFKD decomposition. */
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

/** Lowercase, accents stripped: the form every comparison runs on. */
export function normalizeText(value: string): string {
	return String(value).toLowerCase().normalize('NFKD').replace(COMBINING_MARKS, '');
}

/**
 * Comparison key for a taxonomy value (category / tag id, display name or
 * slug): normalised, non `[a-z0-9]` runs collapsed to `-`. "Open Source",
 * "open-source" and "Open-Source" share one key.
 */
export function taxonomySlug(value: string): string {
	return normalizeText(String(value).trim())
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
