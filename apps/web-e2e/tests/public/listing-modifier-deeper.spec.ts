import { test, expect } from '@playwright/test';

// Listing modifier combinations on /discover/1: sort, view, q, page-num,
// invalid combinations. All must respond non-5xx and load DOM.

const MODIFIER_PROBES = [
	'/discover/1?sort=newest&view=grid',
	'/discover/1?sort=oldest&view=list',
	'/discover/1?sort=popular&view=map',
	'/discover/1?sort=alphabetical&view=grid',
	'/discover/1?sort=NOT-A-REAL-SORT',
	'/discover/1?view=NOT-A-REAL-VIEW',
	'/discover/1?sort=&view=',
	'/discover/1?sort=newest&sort=oldest',
	'/discover/1?view=grid&view=list',
	'/discover/1?q=&sort=',
	'/discover/1?q=' + encodeURIComponent('   '),
	'/discover/1?utm_source=test&sort=newest',
	'/discover/1?gclid=12345&fbclid=67890'
];

test.describe('Listing modifier deeper tolerance', () => {
	for (const path of MODIFIER_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
