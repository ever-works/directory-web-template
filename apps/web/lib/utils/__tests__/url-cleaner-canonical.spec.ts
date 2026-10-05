import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

/**
 * Canonical origin pin (NEXT_PUBLIC_CANONICAL_URL).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A directory can be served by ONE deployment on two hosts: a brand domain and
 * the deploy platform's host. The platform sets NEXT_PUBLIC_APP_URL to its own
 * host, so without a pin every page on the brand domain declared
 * <link rel="canonical"> (and hreflang, og:url, sitemap <loc>, JSON-LD) on the
 * platform host, handing indexing of the brand domain to the platform host.
 *
 * url-cleaner computes its values once at module load, and node:test runs each
 * spec file in its own process, so the env is set BEFORE the dynamic import.
 */

const APP_URL = 'https://directory.platform.example';
const CANONICAL = 'https://brand.example';

type UrlCleaner = typeof import('../url-cleaner');
let mod: UrlCleaner;

before(async () => {
	process.env.NEXT_PUBLIC_APP_URL = APP_URL;
	// Trailing slash on purpose: the pin must be normalised to a bare origin.
	process.env.NEXT_PUBLIC_CANONICAL_URL = `${CANONICAL}/`;
	mod = await import('../url-cleaner');
});

describe('resolveCanonicalOrigin', () => {
	it('returns undefined when unset, empty or blank (pin disabled)', () => {
		assert.equal(mod.resolveCanonicalOrigin(undefined), undefined);
		assert.equal(mod.resolveCanonicalOrigin(''), undefined);
		assert.equal(mod.resolveCanonicalOrigin('   '), undefined);
	});

	it('strips trailing slashes and adds a missing scheme', () => {
		assert.equal(mod.resolveCanonicalOrigin('https://brand.example///'), CANONICAL);
		assert.equal(mod.resolveCanonicalOrigin('brand.example'), CANONICAL);
	});

	it('ignores a value that is not an absolute URL', () => {
		assert.equal(mod.resolveCanonicalOrigin('https://'), undefined);
	});

	it('accepts an http(s) ORIGIN only: no path, query, fragment or credentials', () => {
		// A path would be prefixed to every published URL (sitemap, robots,
		// canonical, hreflang): https://brand.example/foo/items/x.
		assert.equal(mod.resolveCanonicalOrigin('https://brand.example/foo'), undefined);
		assert.equal(mod.resolveCanonicalOrigin('https://brand.example/?a=1'), undefined);
		assert.equal(mod.resolveCanonicalOrigin('https://brand.example/#top'), undefined);
		assert.equal(mod.resolveCanonicalOrigin('https://user:pw@brand.example'), undefined);
		assert.equal(mod.resolveCanonicalOrigin('ftp://brand.example'), undefined);
	});

	it('returns the normalised origin', () => {
		assert.equal(mod.resolveCanonicalOrigin('https://Brand.Example/'), CANONICAL);
		assert.equal(mod.resolveCanonicalOrigin('https://brand.example:443'), CANONICAL);
	});
});

describe('with NEXT_PUBLIC_CANONICAL_URL pinned', () => {
	it('CONTROL: the app URL is still the platform host', () => {
		assert.equal(mod.getAppBaseUrl(), APP_URL);
	});

	it('getCanonicalOrigin returns the pinned origin', () => {
		assert.equal(mod.getCanonicalOrigin(), CANONICAL);
	});

	it('getBaseUrl (canonical, hreflang, feeds, sitemap, robots) uses the pinned origin', () => {
		assert.equal(mod.getBaseUrl(), CANONICAL);
	});

	it('buildUrl (functional round trips such as payment returns) keeps the app URL', () => {
		assert.equal(mod.buildUrl('/settings/billing'), `${APP_URL}/settings/billing`);
	});
});
