import { test, expect } from '@playwright/test';

/**
 * Canonical URLs must point where we intend — not merely exist.
 *
 * The sibling spec `canonical-link-presence.spec.ts` covers the same pages but
 * only asserts the href is non-empty and not the literal "undefined"/"null".
 * It could never have caught the defect below, for two reasons:
 *
 *   1. it never compares the href to the URL that was requested, and
 *   2. a MISSING canonical calls `test.skip()` (lines 22-25) rather than
 *      failing — so "no canonical at all" is a passing result.
 *
 * The defect it missed, live on demo.ever.works:
 *
 *     GET /              ->  <link rel="canonical" href="https://host/discover/1">
 *
 * The site root disowned itself in favour of a paginated listing. `/` has no
 * page file: `next.config.ts` rewrites `/:path` -> `/:path/discover/1` and
 * next-intl's `localePrefix: 'as-needed'` maps `/` -> `/en` first, so `/` is
 * rendered by `app/[locale]/(listing)/discover/[page]/page.tsx`, whose
 * `generateMetadata` derived the canonical from its own `page` param.
 *
 * Meanwhile `app/sitemap.ts` submits the bare `/` at HOME priority and never
 * submits `/discover/1`. So the sitemap said "index /" while the page said
 * "index /discover/1". Canonical wins, and the most linkable URL on the site
 * was consolidated out of the index.
 *
 * NOTE the deliberate asymmetry below: `/discover/1` is NOT self-referential.
 * It renders byte-identical content to `/`, so it correctly consolidates TO
 * `/`. Page 2+ stays self-referential. Encoding the intended mapping — rather
 * than a blanket "canonical === request" rule — is what makes this test able to
 * distinguish the fix from the bug, since the bug also produced a canonical
 * that was "valid" by every check the old spec made.
 */

/** requested path -> the pathname its canonical must resolve to */
const EXPECTED_CANONICAL: Record<string, string> = {
	'/': '/',
	// Duplicate of the root; consolidates to it on purpose.
	'/discover/1': '/',
	// Real paginated pages point at themselves.
	'/discover/2': '/discover/2',
	'/about': '/about',
	'/categories': '/categories',
	'/tags': '/tags',
	'/pricing': '/pricing',
};

test.describe('Canonical self-reference', () => {
	for (const [path, expectedPathname] of Object.entries(EXPECTED_CANONICAL)) {
		test(`${path} canonicalises to ${expectedPathname}`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp, `no response for ${path}`).toBeTruthy();

			// A 404 here is a real failure, not a reason to skip: every path in
			// this map is a page we publish and submit in the sitemap.
			expect(resp!.status(), `${path} returned ${resp!.status()}`).toBeLessThan(400);

			const links = page.locator('link[rel="canonical"]');

			// Exactly one canonical. Two is as broken as none — search engines
			// ignore the tag entirely when it is ambiguous.
			await expect(links, `${path} must declare exactly one canonical`).toHaveCount(1);

			const href = await links.first().getAttribute('href');
			expect(href, `${path} has a canonical with no href`).toBeTruthy();

			// Compare pathnames, not full URLs: the host differs per environment
			// (localhost in CI, demo/stage/prod otherwise) and asserting the host
			// would make this fail for the wrong reason.
			const actualPathname = new URL(href!, page.url()).pathname.replace(/\/$/, '') || '/';
			const wantPathname = expectedPathname.replace(/\/$/, '') || '/';

			expect(
				actualPathname,
				`${path} canonicalises to "${actualPathname}", expected "${wantPathname}"`,
			).toBe(wantPathname);
		});
	}

	test('the homepage and the sitemap agree on the homepage URL', async ({ page, request }) => {
		// The two signals contradicting each other is what actually de-indexed
		// the root, so assert them together rather than trusting each alone.
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(400);

		const href = await page.locator('link[rel="canonical"]').first().getAttribute('href');
		expect(href, 'homepage has no canonical').toBeTruthy();
		const canonical = new URL(href!, page.url());

		const sitemap = await request.get('/sitemap.xml');
		expect(sitemap.status(), 'sitemap.xml must be served').toBeLessThan(400);
		const xml = await sitemap.text();

		// Control: the sitemap must be a real one, or "contains the canonical"
		// would be vacuously interesting.
		expect(xml, 'sitemap.xml does not look like a sitemap').toContain('<urlset');
		expect(xml.match(/<loc>/g)?.length ?? 0).toBeGreaterThan(1);

		const canonicalNoSlash = canonical.href.replace(/\/$/, '');
		expect(
			xml.includes(`<loc>${canonical.href}</loc>`) ||
				xml.includes(`<loc>${canonicalNoSlash}</loc>`),
			`homepage canonical ${canonical.href} is not submitted in sitemap.xml`,
		).toBe(true);
	});
});
