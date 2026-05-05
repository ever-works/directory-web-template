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
	interface NamedRef {
		name?: string;
	}
	interface ItemShape {
		slug?: string;
		id?: string;
		name?: string;
		title?: string;
		url?: string;
		description?: string;
		// Canonical content shape (lib/content.ts ItemData) carries the
		// SINGULAR polymorphic `category` field (string | object | array)
		// plus a polymorphic `tags` field (string[] | Tag[]). Older
		// callers sometimes also pass a pre-flattened `categories`
		// string[] or a `meta.category` array; we tolerate both shapes
		// and normalize to a plain `string[]` so downstream JSON
		// consumers always see canonical `categories: string[]` /
		// `tags: string[]`.
		category?: string | NamedRef | ReadonlyArray<string | NamedRef>;
		categories?: ReadonlyArray<string | NamedRef>;
		tags?: ReadonlyArray<string | NamedRef>;
		source_url?: string;
		meta?: {
			source_url?: string;
			url?: string;
			description?: string;
			category?: string | NamedRef | ReadonlyArray<string | NamedRef>;
			categories?: ReadonlyArray<string | NamedRef>;
			tags?: ReadonlyArray<string | NamedRef>;
		};
	}

	function toNameArray(
		value: string | NamedRef | ReadonlyArray<string | NamedRef> | undefined | null
	): string[] {
		if (value == null) return [];
		const list = Array.isArray(value) ? value : [value];
		const out: string[] = [];
		for (const entry of list) {
			if (typeof entry === 'string') {
				const trimmed = entry.trim();
				if (trimmed) out.push(trimmed);
			} else if (entry && typeof entry.name === 'string') {
				const trimmed = entry.name.trim();
				if (trimmed) out.push(trimmed);
			}
		}
		return out;
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
		items: items.map((item) => {
			const categories = toNameArray(
				item.meta?.categories ?? item.meta?.category ?? item.categories ?? item.category
			);
			const tags = toNameArray(item.meta?.tags ?? item.tags);
			return {
				slug: item.slug ?? item.id,
				name: item.name ?? item.title,
				url:
					item.meta?.source_url ||
					item.meta?.url ||
					item.source_url ||
					item.url ||
					(siteUrl ? `${siteUrl}/items/${item.slug ?? item.id}` : undefined),
				description: item.meta?.description || item.description,
				categories,
				tags
			};
		})
	};

	return NextResponse.json(payload, {
		status: 200,
		headers: {
			'Cache-Control': 'public, max-age=300, s-maxage=900',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
