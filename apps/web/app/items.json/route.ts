import { NextResponse } from 'next/server';
import { getCachedConfig, getCachedItems } from '@/lib/content';

/**
 * Public canonical-data endpoint that emits every directory item as JSON,
 * so downstream agents and integrations can consume the directory without
 * scraping HTML.
 *
 * The shape is intentionally minimal and stable across templates:
 *
 * ```json
 * {
 *   "site": { "name": "...", "url": "...", "description": "..." },
 *   "generatedAt": "2026-05-05T12:34:56Z",
 *   "count": 42,
 *   "items": [
 *     { "slug": "...", "name": "...", "url": "...", "categories": [...], "tags": [...], "description": "..." },
 *     ...
 *   ]
 * }
 * ```
 *
 * The route pairs with /llms.txt — the latter advertises this URL to LLM
 * agents, and this route returns the data they actually need.
 */
export async function GET(): Promise<NextResponse> {
	const [config, items] = await Promise.all([
		getCachedConfig(),
		getCachedItems().catch(
			() => [] as Array<{ slug?: string; id?: string; name?: string; meta?: Record<string, unknown> }>
		)
	]);

	const siteUrl = (config.app_url || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
	const payload = {
		site: {
			name: config.company_name || 'Ever Works Directory',
			url: siteUrl,
			description: config.company_description || ''
		},
		generatedAt: new Date().toISOString(),
		count: items.length,
		items: items.map((item: any) => ({
			slug: item.slug ?? item.id,
			name: item.name ?? item.title,
			url: item.meta?.source_url || item.meta?.url || item.url || (siteUrl ? `${siteUrl}/items/${item.slug ?? item.id}` : undefined),
			description: item.meta?.description || item.description,
			categories: item.meta?.category ?? item.categories ?? [],
			tags: item.meta?.tags ?? item.tags ?? []
		}))
	};

	return NextResponse.json(payload, {
		status: 200,
		headers: {
			'Cache-Control': 'public, max-age=300, s-maxage=900',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
