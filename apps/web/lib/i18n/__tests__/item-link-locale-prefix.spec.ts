import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPathname } from '../../../i18n/navigation';
import { routing } from '../../../i18n/routing';
import { getItemPath } from '../../utils';
import { DEFAULT_LOCALE, LOCALES } from '../locales';

/**
 * Item cards, sponsor cards and the map views link to item detail pages through
 * the next-intl `Link` from `@/i18n/navigation`, which prefixes the active
 * locale itself. Those components used to prefix `/${locale}` as well, so every
 * card on `/fr` linked to `/fr/fr/items/<slug>`: a 404 for visitors and, on one
 * directory, ~38k crawler 404s a day (2026-10).
 *
 * The href handed to that `Link` must be locale-free. These tests pin that
 * `getItemPath` is, and that the `Link`'s own resolution (`getPathname`, which
 * it shares) then yields exactly one locale segment.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

const SLUG = 'time-doctor';
const NON_DEFAULT_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

describe('getItemPath', () => {
	it('returns a locale-free path', () => {
		assert.equal(getItemPath(SLUG), `/items/${SLUG}`);
	});
});

describe('item links resolved by the next-intl Link', () => {
	it('carry exactly one locale segment on every non-default locale', () => {
		for (const locale of NON_DEFAULT_LOCALES) {
			assert.equal(getPathname({ href: getItemPath(SLUG), locale }), `/${locale}/items/${SLUG}`);
		}
	});

	it('follow the configured prefix style on the default locale', () => {
		const expected = routing.localePrefix === 'always' ? `/${DEFAULT_LOCALE}/items/${SLUG}` : `/items/${SLUG}`;
		assert.equal(getPathname({ href: getItemPath(SLUG), locale: DEFAULT_LOCALE }), expected);
	});

	it('double the segment when the href is already prefixed (the old bug)', () => {
		assert.equal(getPathname({ href: `/fr${getItemPath(SLUG)}`, locale: 'fr' }), `/fr/fr/items/${SLUG}`);
	});
});
