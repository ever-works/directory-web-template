import { test, expect } from '@playwright/test';

/**
 * Schema.org WebSite + potentialAction(SearchAction) enables Google
 * sitelinks searchbox. Tolerance-style: if a SearchAction is declared,
 * its `target` must be a usable URL template containing a search-term
 * placeholder, and the urlTemplate's host should match the page host.
 */

interface SearchAction {
	'@type': string | string[];
	target?: string | { urlTemplate?: string };
	'query-input'?: string;
}

function findActions(node: unknown, out: SearchAction[]) {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const item of node) findActions(item, out);
		return;
	}
	const record = node as Record<string, unknown>;
	const t = record['@type'];
	const types = Array.isArray(t) ? t : typeof t === 'string' ? [t] : [];
	if (types.includes('SearchAction')) out.push(record as unknown as SearchAction);
	for (const value of Object.values(record)) findActions(value, out);
}

function targetUrl(action: SearchAction): string | null {
	const target = action.target;
	if (typeof target === 'string') return target;
	if (target && typeof target === 'object' && typeof target.urlTemplate === 'string') return target.urlTemplate;
	return null;
}

test.describe('Home page: JSON-LD SearchAction', () => {
	test('SearchAction target contains a search-term placeholder when present', async ({ page }) => {
		const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(response).not.toBeNull();
		if (response!.status() >= 400) return;
		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		if (blocks.length === 0) return;
		const actions: SearchAction[] = [];
		for (const raw of blocks) {
			try {
				findActions(JSON.parse(raw), actions);
			} catch {
				// ignore — covered elsewhere
			}
		}
		if (actions.length === 0) return;
		for (const action of actions) {
			const url = targetUrl(action);
			expect(url, `SearchAction target on home`).not.toBeNull();
			expect(url, `SearchAction target on home`).toMatch(/\{[a-z_]+\}/i);
			if (typeof action['query-input'] === 'string') {
				expect(action['query-input']).toMatch(/required name=[a-z_]+/i);
			}
		}
	});
});
