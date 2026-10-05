import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alternateLinksHeaderEnabled } from '../alternate-links-header';
import { routing } from '../../../i18n/routing';

/**
 * next-intl's hreflang `Link` response header (lib/i18n/alternate-links-header.ts).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Measured on a directory built from this template with its canonical origin
 * pinned: every response carried `Link: <http://REQUEST-HOST/fr/REQUEST-PATH>;
 * rel="alternate"; hreflang="fr", ...` for 21 locales plus x-default, naming
 * the host and path the request arrived on (a legacy alias, a junk path) while
 * the HTML hreflang named the pinned origin and the canonical path.
 */

describe('alternateLinksHeaderEnabled', () => {
	it('is off by default', () => {
		assert.equal(alternateLinksHeaderEnabled(undefined), false);
		assert.equal(alternateLinksHeaderEnabled(''), false);
	});

	it('is on only for an explicit true', () => {
		assert.equal(alternateLinksHeaderEnabled('true'), true);
		assert.equal(alternateLinksHeaderEnabled(' TRUE '), true);
	});

	it('stays off for anything else', () => {
		for (const value of ['false', '0', '1', 'yes', 'on']) {
			assert.equal(alternateLinksHeaderEnabled(value), false, value);
		}
	});
});

describe('i18n routing', () => {
	it('does not let the middleware send the hreflang Link header by default', () => {
		// next-intl sends the header unless `alternateLinks` is exactly false.
		const expected = alternateLinksHeaderEnabled(process.env.I18N_ALTERNATE_LINKS_HEADER);
		assert.equal(routing.alternateLinks, expected);
		if (!process.env.I18N_ALTERNATE_LINKS_HEADER) {
			assert.equal(routing.alternateLinks, false);
		}
	});
});
