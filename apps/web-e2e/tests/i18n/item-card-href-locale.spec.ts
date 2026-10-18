import { test, expect, type Page } from '@playwright/test';

/**
 * Item cards link through the next-intl `Link` from `@/i18n/navigation`, which
 * prefixes the active locale itself. The cards used to prefix `/${locale}` as
 * well, so every card on `/fr` linked to `/fr/fr/items/<slug>`: a 404 for
 * visitors and, on one directory, ~38k crawler 404s a day (2026-10).
 *
 * Guard: on a non-default locale homepage every item link carries exactly one
 * locale segment, no anchor repeats the locale, and a card's href resolves.
 */

const NON_DEFAULT_LOCALES = ['fr', 'de', 'zh'] as const;
const PAGE_READY_TIMEOUT = 15_000;

async function internalHrefs(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		Array.from(document.querySelectorAll('a[href^="/"]'))
			.map((a) => a.getAttribute('href') || '')
			.filter((h) => h.length > 0)
	);
}

test.describe('i18n: item card hrefs on locale homepages', () => {
	for (const locale of NON_DEFAULT_LOCALES) {
		test(`/${locale} item cards link to /${locale}/items/<slug>`, async ({ page, request }) => {
			const resp = await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
			expect(resp?.status() ?? 0, `/${locale}`).toBeLessThan(400);
			// Let the client-rendered listing settle before reading hrefs.
			await page.waitForTimeout(2_000);

			const hrefs = await internalHrefs(page);
			const doubled = hrefs.filter((h) => h === `/${locale}/${locale}` || h.startsWith(`/${locale}/${locale}/`));
			expect(doubled, `anchors repeating /${locale}/`).toEqual([]);

			const itemHrefs = hrefs.filter((h) => h.includes('/items/'));
			test.skip(itemHrefs.length === 0, `No item cards rendered on /${locale}`);

			const singleSegment = new RegExp(`^/${locale}/items/[^/?#]+`);
			for (const href of itemHrefs) {
				expect(href, 'item href should carry exactly one locale segment').toMatch(singleSegment);
			}

			const first = itemHrefs[0];
			const detail = await request.get(first);
			expect(detail.status(), first).toBeLessThan(400);
		});
	}
});
