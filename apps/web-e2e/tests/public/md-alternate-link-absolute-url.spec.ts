import { test, expect } from '@playwright/test';

/**
 * Every static info page advertises its Markdown mirror to crawlers via
 *
 *   <link rel="alternate" type="text/markdown" href="https://host/about.md" />
 *
 * `getLocalizedUrl()` (apps/web/lib/seo/hreflang.ts) already returns an
 * ABSOLUTE url. Four pages (about, cookies, privacy-policy,
 * terms-of-service) additionally prefixed it with `appUrl`, so the
 * metadata value was `https://hosthttps://host/about.md`.
 *
 * What actually shipped in the HTML is worse than that string suggests.
 * `https://hosthttps://host/about.md` is not parseable as an absolute
 * url (`3000http:` is not a port), so Next.js resolved it RELATIVE to
 * `metadataBase` — which both `app/layout.tsx` and
 * `app/[locale]/layout.tsx` set. Observed on a dev server:
 *
 *   href="http://localhost:3000/http:/localhost:3000http:/localhost:3000/about.md"
 *
 * Note the `://` were collapsed to `:/` by url normalisation. So a
 * "contains exactly one ://" check does NOT catch the real regression on
 * its own, and neither does `new URL(href)` — that parses the mangled
 * href quite happily. The load-bearing assertion is the pathname one:
 * the doubled origin survives buried inside the PATH, and comparing the
 * path against the mirror path it is supposed to advertise is what
 * actually fails. The `://` count is kept as a cheap second net for a
 * future page that omits `metadataBase` and emits the raw doubled
 * string verbatim.
 *
 * `md-mirror-routes.spec.ts` could not have caught this: it fetches the
 * `.md` paths directly and never looks at the href the HTML advertises.
 */

// Every slug wired into the `/_static-md` catch-all in next.config.ts
// that also renders an HTML page emitting the alternate link.
// `faq` is intentionally absent: it is not on develop yet.
const MD_ALTERNATE_PAGES = ['/about', '/cookies', '/privacy-policy', '/terms-of-service', '/help', '/pricing'];

// Default locale is unprefixed ("as-needed"); `/fr` exercises the
// prefixed branch of getLocalizedUrl(), which is where a doubled origin
// produces a different-but-equally-broken string.
const LOCALE_PREFIXES = ['', '/fr'];

const MD_ALTERNATE_SELECTOR = 'link[rel="alternate"][type="text/markdown"]';

test.describe('Markdown alternate link is a single absolute URL', () => {
	for (const prefix of LOCALE_PREFIXES) {
		for (const path of MD_ALTERNATE_PAGES) {
			const pagePath = `${prefix}${path}`;

			test(`${pagePath} advertises a well-formed text/markdown alternate`, async ({ page }) => {
				const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
				expect(response, pagePath).not.toBeNull();
				const status = response!.status();
				// A 5xx is never "this deployment does not ship the page" — let
				// it fail rather than skip, so a broken page cannot quietly opt
				// itself out of this guard.
				expect(status, `${pagePath} must not 5xx`).toBeLessThan(500);
				// A page a given deployment genuinely does not serve is out of
				// scope; the url-shape assertions below stay strict.
				if (status === 404 || status === 410) {
					test.skip();
					return;
				}

				// Probe the count first: `getAttribute()` waits for the element
				// and would burn the full 30s expect timeout if it were absent.
				const count = await page.locator(MD_ALTERNATE_SELECTOR).count();
				expect(count, `${pagePath} declares ${MD_ALTERNATE_SELECTOR}`).toBeGreaterThan(0);

				const href = await page.locator(MD_ALTERNATE_SELECTOR).first().getAttribute('href');
				expect(href, `${pagePath} markdown alternate href`).toBeTruthy();
				const value = (href ?? '').trim();

				// 1. It must parse as an absolute http(s) url.
				let parsed: URL | undefined;
				try {
					parsed = new URL(value);
				} catch {
					parsed = undefined;
				}
				expect(parsed, `"${value}" on ${pagePath} must parse as an absolute URL`).toBeDefined();
				const url = parsed as URL;
				expect(['http:', 'https:'], `"${value}" on ${pagePath} protocol`).toContain(url.protocol);
				expect(url.hostname, `"${value}" on ${pagePath} hostname`).not.toBe('');

				// 2. The origin must appear exactly once — a raw, unresolved
				// doubled origin still carries two "://".
				const schemeSeparators = value.split('://').length - 1;
				expect(schemeSeparators, `"${value}" on ${pagePath} must contain exactly one "://"`).toBe(1);

				// 3. The real detector. A doubled origin that Next.js resolved
				// against metadataBase hides in the PATH, e.g.
				// "/http:/host/http:/host/about.md" instead of "/about.md".
				expect(url.pathname, `"${value}" on ${pagePath} must advertise the plain mirror path`).toBe(
					`${prefix}${path}.md`
				);
			});
		}
	}
});
