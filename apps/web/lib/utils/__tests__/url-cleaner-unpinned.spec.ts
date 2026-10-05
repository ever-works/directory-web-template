import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

/**
 * NEXT_PUBLIC_CANONICAL_URL empty = today's behaviour.
 *
 * The k8s-build workflow passes '' whenever a repository has no
 * SITE_CANONICAL_URL variable (and for every :dev / :stage image). Every
 * published URL must then stay on NEXT_PUBLIC_APP_URL exactly as before.
 *
 * Its own spec file because url-cleaner reads the env once at module load and
 * node:test runs each spec file in its own process.
 */

const APP_URL = 'https://directory.platform.example';

type UrlCleaner = typeof import('../url-cleaner');
let mod: UrlCleaner;

before(async () => {
	process.env.NEXT_PUBLIC_APP_URL = APP_URL;
	process.env.NEXT_PUBLIC_CANONICAL_URL = '';
	mod = await import('../url-cleaner');
});

describe('with NEXT_PUBLIC_CANONICAL_URL empty', () => {
	it('there is no canonical pin', () => {
		assert.equal(mod.getCanonicalOrigin(), undefined);
	});

	it('getBaseUrl is the app URL, as before', () => {
		assert.equal(mod.getBaseUrl(), APP_URL);
	});

	it('getAppBaseUrl and buildUrl are the app URL', () => {
		assert.equal(mod.getAppBaseUrl(), APP_URL);
		assert.equal(mod.buildUrl('/settings/billing'), `${APP_URL}/settings/billing`);
	});
});
