/**
 * RSS 2.0 feed at /rss.xml.
 *
 * Sibling to /atom.xml and /feed.json, intended for traditional RSS
 * readers and search-engine feed crawlers.
 */

import { NextResponse } from 'next/server';
import { getCachedConfig, getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { buildFeedEntries, generateRss, resolveFeedConfig } from '@/lib/seo/feeds';

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
	const xml = generateRss(entries, feedConfig);

	return new NextResponse(xml, {
		status: 200,
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600'
		}
	});
}
