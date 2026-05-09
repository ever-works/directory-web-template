/**
 * JSON Feed 1.1 at /feed.json.
 *
 * JSON-native alternative to RSS/Atom. Useful for AI agents,
 * dashboards, and any consumer that prefers JSON over XML.
 *
 * @see https://www.jsonfeed.org/version/1.1/
 */

import { NextResponse } from 'next/server';
import { getCachedConfig, getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { buildFeedEntries, generateJsonFeed, resolveFeedConfig } from '@/lib/seo/feeds';

export const revalidate = 600;

export async function GET(): Promise<NextResponse> {
	const [config, fetched] = await Promise.all([
		getCachedConfig(),
		getCachedItems().catch(() => ({ items: [] }))
	]);
	const items = (fetched as { items?: import('@/lib/content').ItemData[] }).items ?? [];

	const description =
		(config as { description?: string; tagline?: string }).description ||
		(config as { tagline?: string }).tagline ||
		`Latest items from ${config.company_name ?? 'Ever Works'}.`;

	const feedConfig = resolveFeedConfig({
		title: config.company_name ?? 'Ever Works Directory',
		description,
		siteUrl: getBaseUrl()
	});

	const entries = buildFeedEntries(items, feedConfig);
	const json = generateJsonFeed(entries, feedConfig);

	return new NextResponse(json, {
		status: 200,
		headers: {
			'Content-Type': 'application/feed+json; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
