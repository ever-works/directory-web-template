/**
 * /llms-full.txt — the long-form companion to /llms.txt.
 *
 * Where /llms.txt is a short manifest pointing at canonical resources,
 * /llms-full.txt is a single concatenated Markdown dump of the entire
 * directory: site preamble, every category and tag, every item with
 * its full body content, and every comparison. AI agents (ChatGPT,
 * Claude, Perplexity, etc.) can ingest the whole directory in one
 * fetch instead of crawling per-page HTML.
 *
 * The endpoint is intentionally cacheable and CDN-friendly: it reuses
 * the same cached content layer as the HTML pages and emits a single
 * UTF-8 plain-text response with no per-request branching.
 *
 * Format follows the llmstxt.org `llms-full.txt` recommendation:
 *
 *   # Site name
 *
 *   > One-line description.
 *
 *   ## Categories
 *
 *   - Category — n items
 *   ...
 *
 *   ## Items
 *
 *   ### Item name
 *   <item details + body>
 *   ---
 *   ### Next item
 *   ...
 *
 * @see https://llmstxt.org/
 */

import { NextResponse } from 'next/server';
import { getCachedConfig, getCachedItems, getCachedComparisons } from '@/lib/content';
import { renderItemMarkdown, renderComparisonMarkdown } from '@/lib/seo/markdown-mirror';

// Edge-case-safe upper bound on items rendered with full bodies. Sites
// with thousands of items can exceed reasonable response sizes; cap to
// keep llms-full.txt usable for agent context windows. Operators who
// need every item should fall back to /items.json or per-page .md.
const MAX_ITEMS_WITH_BODY = 500;

export const revalidate = 600;

export async function GET(): Promise<NextResponse> {
	const [config, fetched, comparisonsResult] = await Promise.all([
		getCachedConfig(),
		getCachedItems().catch(() => ({ items: [], categories: [], tags: [] })),
		getCachedComparisons().catch(() => ({ comparisons: [], total: 0 }))
	]);

	const items = (fetched as { items?: Array<unknown> }).items ?? [];
	const categories = (fetched as { categories?: Array<{ id?: string; name?: string; count?: number }> }).categories ?? [];
	const tags = (fetched as { tags?: Array<{ id?: string; name?: string; count?: number }> }).tags ?? [];
	const comparisons =
		(comparisonsResult as { comparisons?: Array<{ slug: string; title: string; summary?: string; item_a_name: string; item_b_name: string; item_a_slug: string; item_b_slug: string; dimensions?: ReadonlyArray<unknown>; generated_at?: string }> }).comparisons ?? [];

	const siteUrl = (config.app_url || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
	const siteName = config.company_name || 'Ever Works Directory';
	const description =
		(config as { description?: string; tagline?: string }).description ||
		(config as { tagline?: string }).tagline ||
		`A curated directory of ${items.length} items.`;

	const lines: string[] = [];
	lines.push(`# ${siteName}`);
	lines.push('');
	lines.push(`> ${description}`);
	lines.push('');
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Items: ${items.length}`);
	lines.push(`Canonical site: ${siteUrl}`);
	lines.push('');

	if (categories.length > 0) {
		lines.push('## Categories');
		lines.push('');
		for (const c of categories) {
			const name = c.name ?? c.id ?? '';
			if (!name) continue;
			lines.push(`- ${name}${c.count ? ` — ${c.count} items` : ''}`);
		}
		lines.push('');
	}

	if (tags.length > 0) {
		lines.push('## Tags');
		lines.push('');
		const top = tags.slice(0, 100);
		for (const t of top) {
			const name = t.name ?? t.id ?? '';
			if (!name) continue;
			lines.push(`- ${name}${t.count ? ` — ${t.count} items` : ''}`);
		}
		if (tags.length > top.length) {
			lines.push('');
			lines.push(`_…and ${tags.length - top.length} more (see ${siteUrl}/tags)._`);
		}
		lines.push('');
	}

	lines.push('## Items');
	lines.push('');
	const cappedItems = items.slice(0, MAX_ITEMS_WITH_BODY);
	for (const raw of cappedItems) {
		// Use the same renderer as the per-item .md mirror, then strip
		// the H1 + footer and demote headings one level so each item
		// sits as an H3 under the H2 "Items" group.
		const itemMd = renderItemMarkdown(raw as { meta: import('@/lib/content').ItemData; content?: string }, {
			baseUrl: siteUrl,
			locale: 'en'
		});
		const demoted = demoteAndStrip(itemMd);
		lines.push(demoted);
		lines.push('');
		lines.push('---');
		lines.push('');
	}

	if (items.length > cappedItems.length) {
		lines.push(`_${items.length - cappedItems.length} additional items omitted to keep this file usable. See ${siteUrl}/items.json or per-item .md mirrors at ${siteUrl}/items/<slug>.md._`);
		lines.push('');
	}

	if (comparisons.length > 0) {
		lines.push('## Comparisons');
		lines.push('');
		for (const cmp of comparisons) {
			const md = renderComparisonMarkdown(cmp as Parameters<typeof renderComparisonMarkdown>[0], { baseUrl: siteUrl, locale: 'en' });
			lines.push(demoteAndStrip(md));
			lines.push('');
			lines.push('---');
			lines.push('');
		}
	}

	const body = lines.join('\n');
	return new NextResponse(body, {
		status: 200,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=300, s-maxage=900',
			'Access-Control-Allow-Origin': '*',
			// Discourage indexing of the dump itself; agents fetch on demand.
			'X-Robots-Tag': 'noindex'
		}
	});
}

/**
 * Demote heading levels by one and strip the trailing
 * "_This Markdown mirror is generated by…_" footer from a per-page
 * mirror so it composes cleanly inside llms-full.txt.
 */
function demoteAndStrip(md: string): string {
	return md
		.split('\n')
		// Drop the per-mirror footer block (last `---` + canonical line).
		.filter(
			(line) => !/^_This Markdown mirror is generated by Ever Works/.test(line) && !/^_Canonical page:/.test(line)
		)
		.join('\n')
		// Demote ATX headings: # → ##, ## → ###, etc. Up to ##### → ######.
		.replace(/^(#{1,5}) /gm, '$1# ')
		// Trim trailing whitespace and collapse 3+ blank lines into 2.
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
