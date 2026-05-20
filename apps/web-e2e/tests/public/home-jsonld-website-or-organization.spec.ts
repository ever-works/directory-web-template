import { test, expect } from '@playwright/test';

/**
 * The home page should declare its identity via Schema.org JSON-LD as
 * either a WebSite or Organization (often both). Google uses this for
 * the "About this result" panel and sitelinks. Missing it is an SEO
 * smell but not a hard error — so the test is tolerance-style: if any
 * JSON-LD exists, at least one block must have a recognised top-level
 * @type.
 */

const SEMANTIC_TYPES = new Set([
	'WebSite',
	'Organization',
	'WebPage',
	'CollectionPage',
	'Corporation',
	'NGO',
	'EducationalOrganization',
	'LocalBusiness'
]);

function collectTypes(node: unknown, out: Set<string>) {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const item of node) collectTypes(item, out);
		return;
	}
	const record = node as Record<string, unknown>;
	const t = record['@type'];
	if (typeof t === 'string') out.add(t);
	else if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') out.add(v);
	const graph = record['@graph'];
	if (graph) collectTypes(graph, out);
}

test.describe('Home page: JSON-LD identity', () => {
	test('home JSON-LD contains a WebSite/Organization @type when present', async ({ page }) => {
		const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(response).not.toBeNull();
		if (response!.status() >= 400) return;
		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		if (blocks.length === 0) return;
		const found = new Set<string>();
		for (const raw of blocks) {
			try {
				collectTypes(JSON.parse(raw), found);
			} catch {
				// malformed JSON-LD is covered elsewhere
			}
		}
		const intersection = [...found].filter((t) => SEMANTIC_TYPES.has(t));
		expect(
			intersection.length,
			`home JSON-LD types ${[...found].join(',')} should include one of ${[...SEMANTIC_TYPES].join('|')}`
		).toBeGreaterThan(0);
	});
});
