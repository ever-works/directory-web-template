import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { getLocalizedUrl, localePathPrefix } from '../hreflang';

/**
 * Locale URL prefixes follow i18n/routing.ts (`LOCALE_URL_STYLE`), Spec 062.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */
describe('localePathPrefix / getLocalizedUrl', () => {
	const original = process.env.LOCALE_URL_STYLE;
	afterEach(() => {
		if (original === undefined) delete process.env.LOCALE_URL_STYLE;
		else process.env.LOCALE_URL_STYLE = original;
	});

	it('as-needed (default): the default locale is unprefixed', () => {
		delete process.env.LOCALE_URL_STYLE;
		assert.equal(localePathPrefix('en'), '');
		assert.equal(localePathPrefix('fr'), '/fr');
		assert.ok(getLocalizedUrl('/items/x', 'en').endsWith('/items/x'));
		assert.ok(!getLocalizedUrl('/items/x', 'en').includes('/en/'));
	});

	it('always: every locale is prefixed, the default one too', () => {
		process.env.LOCALE_URL_STYLE = 'always';
		assert.equal(localePathPrefix('en'), '/en');
		assert.ok(getLocalizedUrl('/items/x', 'en').endsWith('/en/items/x'));
		assert.ok(getLocalizedUrl('', 'en').endsWith('/en'));
	});
});
