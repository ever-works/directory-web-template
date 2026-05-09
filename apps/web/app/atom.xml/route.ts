/**
 * Atom 1.0 feed at /atom.xml.
 *
 * Sibling to /rss.xml and /feed.json. Atom is the more strictly
 * specified XML feed format; RSS readers, search-engine crawlers, and
 * AI agents alike accept both.
 */

import { NextResponse } from 'next/server';
import { getCachedConfig, getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { buildFeedEntries, generateAtom, resolveFeedConfig } from '@/lib/seo/feeds';

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
	const xml = generateAtom(entries, feedConfig);

	return new NextResponse(xml, {
		status: 200,
		headers: {
			'Content-Type': 'application/atom+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600'
		}
	});
}
