/**
 * Shared heuristics for deciding how to render a collection / item icon
 * stored as `icon_url`. The same string can hold either a URL, an emoji
 * glyph, or be empty — we render each case differently in the UI.
 */

const URL_PATTERN = /^(?:https?:\/\/|\/|data:image\/)/i;

export function isLikelyUrl(value?: string | null): value is string {
	return !!value && URL_PATTERN.test(value.trim());
}

export function isLikelyEmoji(value?: string | null): value is string {
	if (!value) return false;
	const trimmed = value.trim();
	// Single grapheme cluster (most emoji are ≤ ~4 code points; allow up to 6
	// for ZWJ sequences), no whitespace, and not a URL.
	return trimmed.length > 0 && trimmed.length <= 6 && !/\s/.test(trimmed) && !isLikelyUrl(trimmed);
}
