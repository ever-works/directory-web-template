import { NextResponse } from 'next/server';
import { loadAgentDataset } from '@/lib/agent-access/server';
import { buildLlmsTxt } from '@/lib/agent-access/discovery';
import { getCategoriesEnabled } from '@/lib/utils/settings';

/**
 * Public llms.txt endpoint per the public llms.txt convention
 * (https://llmstxt.org). Tells downstream LLM agents what the directory is
 * and how to query it without scraping HTML:
 *
 *  - the Read API (`/data/*.json`), its OpenAPI 3.1 description and the
 *    stateless MCP endpoint (`/mcp`) with a ready-to-paste client config —
 *    Agent Access Contract v1, docs/spec/062-agent-access/spec.md;
 *  - every category with a link;
 *  - /llms-full.txt, the legacy /items.json, the sitemap, the feeds and the
 *    per-page Markdown mirrors (`<page>.md`).
 *
 * Every link is absolute (the public origin, `getBaseUrl()`). The body is
 * built by `buildLlmsTxt()` (lib/agent-access/discovery.ts, unit-tested).
 *
 * Designed to pair with the Ever Works zero-friction onboarding feature
 * so that any directory built by an agent through `POST /api/register-work`
 * is immediately discoverable and indexable by other LLM agents.
 */
// Rendered per request: a copy prerendered at build time would name the
// fallback origin (see app/robots.ts). CDN-cached through `s-maxage`.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
	const dataset = await loadAgentDataset();
	let categoriesEnabled = true;
	try {
		categoriesEnabled = getCategoriesEnabled();
	} catch {
		// Unreadable settings: keep the categories (the setting's own default).
	}

	const body = buildLlmsTxt({ info: dataset.info, categories: dataset.categories, categoriesEnabled });

	return new NextResponse(body, {
		status: 200,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=300, s-maxage=900',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
