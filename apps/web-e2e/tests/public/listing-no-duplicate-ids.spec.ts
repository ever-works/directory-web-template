import { test, expect } from '@playwright/test';

// Duplicate DOM ids break label-for, ARIA, and JS selectors.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin', '/items/sample'];

test.describe('No duplicate DOM ids', () => {
	for (const path of PROBES) {
		test(`${path} ids are unique`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const dups = await page.evaluate(() => {
				const ids = Array.from(document.querySelectorAll('[id]'))
					.map((el) => el.getAttribute('id'))
					.filter((id): id is string => !!id);
				const seen = new Set<string>();
				const dups: string[] = [];
				for (const id of ids) {
					if (seen.has(id)) dups.push(id);
					seen.add(id);
				}
				return dups;
			});
			expect(dups, `${path} duplicate ids: ${dups.join(', ')}`).toEqual([]);
		});
	}
});
