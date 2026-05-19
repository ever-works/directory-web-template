import { test, expect } from '@playwright/test';

// Third-party script src domains on / — for hygiene + privacy. We don't
// ban any specific tracker; we DO check that none use plain http://.

const ROUTE = '/';

test.describe('Third-party script domains hygiene', () => {
	test(`${ROUTE} no http:// script sources (mixed-content)`, async ({ page }) => {
		const resp = await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const bad = await page.evaluate(() =>
			Array.from(document.querySelectorAll('script[src]'))
				.map((s) => s.getAttribute('src') || '')
				.filter((u) => u.startsWith('http://') && !u.startsWith('http://localhost'))
		);
		expect(bad, `http:// scripts on /: ${bad.join(', ')}`).toEqual([]);
	});

	test(`${ROUTE} no script src is literal "undefined" or "null"`, async ({ page }) => {
		const resp = await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const bad = await page.evaluate(() =>
			Array.from(document.querySelectorAll('script[src]'))
				.map((s) => s.getAttribute('src') || '')
				.filter((u) => u === 'undefined' || u === 'null' || u === '')
		);
		expect(bad, `bad script src on /: ${bad.join(', ')}`).toEqual([]);
	});
});
