/**
 * Helpers for recognising that two submissions point at the same link.
 *
 * Pure functions with no framework imports so they can be unit-tested directly.
 * See docs/spec/058-duplicate-submission-guard/spec.md.
 */

/** Query parameters that only track where a visitor came from, never which page they land on. */
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid']);

function isTrackingParam(name: string): boolean {
	const lower = name.toLowerCase();
	return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower);
}

/**
 * Reduce a link to a comparison key, or `null` when it is not a usable http(s) URL.
 *
 * Two links get the same key when they differ only by: scheme (http / https),
 * letter case of the host, a leading `www.`, trailing slashes, a `#fragment`,
 * tracking parameters (`utm_*`, `fbclid`, ...) or the order of the other
 * parameters. Anything else (path, path case, other parameters, a non-default
 * port) keeps two links apart, so different pages on one site are never merged.
 */
export function normalizeSourceUrl(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	if (!host) return null;

	const port = url.port ? `:${url.port}` : '';
	const path = url.pathname.replace(/\/+$/, '');

	const kept: Array<[string, string]> = [];
	url.searchParams.forEach((value, key) => {
		if (!isTrackingParam(key)) kept.push([key, value]);
	});
	// Sort by name only (a stable sort): repeated values of one name keep their order, because
	// `?id=1&id=2` and `?id=2&id=1` can open different pages.
	kept.sort(([ak], [bk]) => (ak < bk ? -1 : ak > bk ? 1 : 0));
	const query = kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

	return `${host}${port}${path}${query ? `?${query}` : ''}`;
}

export interface SourceUrlCandidate {
	slug: string;
	source_url?: string | null;
	status: string;
}

/** Statuses that still occupy a link: a rejected or draft entry does not block a new submission. */
const BLOCKING_STATUSES = new Set(['pending', 'approved']);

/**
 * Find an existing pending or approved item whose link matches `sourceUrl`
 * (see {@link normalizeSourceUrl}). Returns `null` when there is none, or when
 * `sourceUrl` is not a usable http(s) URL (the caller's own validation decides
 * what to do with that).
 */
export function findItemBySourceUrl<T extends SourceUrlCandidate>(items: readonly T[], sourceUrl: string): T | null {
	const wanted = normalizeSourceUrl(sourceUrl);
	if (!wanted) return null;

	for (const item of items) {
		if (!BLOCKING_STATUSES.has(item.status)) continue;
		if (normalizeSourceUrl(item.source_url) === wanted) return item;
	}
	return null;
}
