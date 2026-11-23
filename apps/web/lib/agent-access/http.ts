/**
 * HTTP helpers shared by the Read API and discovery routes: JSON with open
 * CORS and a CDN-cacheable `Cache-Control`.
 */

/** Browsers revalidate after 5 minutes, a CDN after 15 (same header as the minimal template and `/items.json`). */
export const AGENT_CACHE_CONTROL = 'public, max-age=300, s-maxage=900';

export const AGENT_CORS_HEADERS: Readonly<Record<string, string>> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Accept'
};

export function agentJson(
	body: unknown,
	init: { status?: number; contentType?: string; cacheControl?: string } = {}
): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: {
			'Content-Type': init.contentType ?? 'application/json; charset=utf-8',
			'Cache-Control': init.cacheControl ?? AGENT_CACHE_CONTROL,
			...AGENT_CORS_HEADERS
		}
	});
}

export function agentNotFound(message: string): Response {
	return agentJson({ error: 'not_found', message }, { status: 404, cacheControl: 'public, max-age=60, s-maxage=60' });
}

/** 204 answer to a CORS preflight. */
export function agentPreflight(): Response {
	return new Response(null, { status: 204, headers: { ...AGENT_CORS_HEADERS, 'Access-Control-Max-Age': '86400' } });
}

/**
 * The slug in a `/data/items/{slug}.json` path segment, or null when the
 * segment does not end in `.json` or names no valid slug.
 */
export function slugFromJsonSegment(segment: string | null | undefined): string | null {
	if (typeof segment !== 'string') return null;
	let decoded: string;
	try {
		decoded = decodeURIComponent(segment);
	} catch {
		return null;
	}
	if (!decoded.endsWith('.json')) return null;
	const slug = decoded.slice(0, -'.json'.length);
	return /^[A-Za-z0-9_-]{1,255}$/.test(slug) ? slug : null;
}
