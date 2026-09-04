/**
 * Blog RSS 2.0 feed at /blog/rss.xml (Spec 050).
 *
 * The site-wide /rss.xml covers directory items; this sibling covers blog
 * posts so readers can subscribe to the blog alone. It reuses the same `feed`
 * library wrapper in `lib/seo/feeds.ts` rather than hand-rolling XML.
 */

import { NextResponse } from 'next/server';
import { getCachedConfig, getCachedPosts } from '@/lib/content';
import { MAX_POSTS_PER_PAGE } from '@/lib/blog/constants';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { buildPostFeedEntries, generateRss, resolveFeedConfig } from '@/lib/seo/feeds';

export const revalidate = 600;

export async function GET(): Promise<NextResponse> {
	const [config, result] = await Promise.all([
		getCachedConfig(),
		getCachedPosts({ perPage: MAX_POSTS_PER_PAGE }).catch(() => ({ posts: [] }))
	]);

	const companyName = (config as { company_name?: string }).company_name ?? 'Ever Works';
	const description =
		(config as { description?: string; tagline?: string }).description ||
		(config as { tagline?: string }).tagline ||
		`Latest blog posts from ${companyName}.`;

	const feedConfig = resolveFeedConfig({
		title: `${companyName} Blog`,
		description,
		siteUrl: getBaseUrl()
	});

	const xml = generateRss(buildPostFeedEntries(result.posts, feedConfig), feedConfig);

	return new NextResponse(xml, {
		status: 200,
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600'
		}
	});
}
