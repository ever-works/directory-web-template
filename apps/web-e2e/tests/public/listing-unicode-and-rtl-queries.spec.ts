import { test, expect } from '@playwright/test';

// Search/listing queries with Unicode, CJK, RTL, emoji, and combining
// characters must not 5xx. The result page can be empty; it just must render.

const UNICODE_SAMPLES: Array<{ label: string; q: string }> = [
	{ label: 'accented latin', q: 'café' },
	{ label: 'CJK Japanese', q: '日本語' },
	{ label: 'CJK simplified Chinese', q: '搜索' },
	{ label: 'Cyrillic', q: 'тест' },
	{ label: 'Arabic (RTL)', q: 'العربية' },
	{ label: 'Hebrew (RTL)', q: 'עברית' },
	{ label: 'emoji', q: '🔥⚡🚀' },
	{ label: 'combining diacritics', q: 'áéí' },
	{ label: 'zero-width chars', q: 'foo​‌‍bar' },
];

test.describe('Public listing: Unicode and RTL query tolerance', () => {
	for (const { label, q } of UNICODE_SAMPLES) {
		test(`discover handles ${label} in q`, async ({ page }) => {
			const url = `/discover?q=${encodeURIComponent(q)}`;
			const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
			expect(response, url).not.toBeNull();
			expect(response!.status(), `status for ${label}`).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
