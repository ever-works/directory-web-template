import { test, expect } from '@playwright/test';

// Spec 020's pagination is URL-driven. Edge inputs that could crash:
//   - non-numeric page params
//   - negative numbers
//   - extremely large numbers
//   - hex / scientific notation
// All should be tolerated gracefully (clamped or 404).

test.describe('Listing pagination edge inputs', () => {
	const PROBES: Array<{ qs: string; name: string }> = [
		{ qs: '?page=abc', name: 'non-numeric' },
		{ qs: '?page=-1', name: 'negative' },
		{ qs: '?page=0', name: 'zero' },
		{ qs: '?page=999999999', name: 'huge' },
		{ qs: '?page=0x10', name: 'hex' },
		{ qs: '?page=1e10', name: 'scientific notation' },
		{ qs: '?page=', name: 'empty' },
		{ qs: '?page=1&page=2', name: 'duplicate param' },
		{ qs: '??page=1', name: 'double question mark' }
	];

	for (const { qs, name } of PROBES) {
		test(`/discover/1${qs} (${name}) does not 5xx`, async ({ page }) => {
			const resp = await page.goto(`/discover/1${qs}`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${qs} (${name})`).toBeLessThan(500);
		});
	}

	test('/discover/page (literal "page" in path) does not 5xx', async ({ page }) => {
		const resp = await page.goto('/discover/page', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/discover/-1 (negative page in path) does not 5xx', async ({ page }) => {
		const resp = await page.goto('/discover/-1', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});
});
