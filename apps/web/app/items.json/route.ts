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
	interface ItemShape {
		slug?: string;
		id?: string;
		name?: string;
		title?: string;
		url?: string;
		description?: string;
		categories?: ReadonlyArray<string>;
		tags?: ReadonlyArray<string>;
		meta?: {
			source_url?: string;
			url?: string;
			description?: string;
			category?: ReadonlyArray<string>;
			tags?: ReadonlyArray<string>;
		};
	}

	const [config, fetchResult] = await Promise.all([
		getCachedConfig(),
		getCachedItems().catch(() => ({ items: [] as ReadonlyArray<ItemShape> }))
	]);

	const items: ReadonlyArray<ItemShape> = ((fetchResult as { items?: ReadonlyArray<ItemShape> })
		.items ?? []) as ReadonlyArray<ItemShape>;

	const siteUrl = (config.app_url || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
	const description =
		(config as { description?: string; tagline?: string }).description ||
		(config as { tagline?: string }).tagline ||
		'';
	const payload = {
		site: {
			name: config.company_name || 'Ever Works Directory',
			url: siteUrl,
			description
		},
		generatedAt: new Date().toISOString(),
		count: items.length,
		items: items.map((item) => ({
			slug: item.slug ?? item.id,
			name: item.name ?? item.title,
			url:
				item.meta?.source_url ||
				item.meta?.url ||
				item.url ||
				(siteUrl ? `${siteUrl}/items/${item.slug ?? item.id}` : undefined),
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
