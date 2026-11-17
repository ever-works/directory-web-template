import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { LOCALES } from '../i18n/locales';

/**
 * The item page's rating label and comment strings (`itemDetail.*` in `messages/*.json`).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `itemDetail.RATING` heads the rating block (`components/item-detail/rating-display.tsx`), labels the rating picker in
 * the comment form and names the star picker for screen readers (`components/ui/rating.tsx`). The `COMMENTS_*` keys are
 * the comment box, its buttons, the delete dialog and the toasts (`components/item-detail/comments-section.tsx`).
 * These keys were left in English in the other locale files. `i18n/request.ts` merges en.json under each locale, so a
 * key left in English renders English and nothing fails; this spec reads each file on its own instead.
 */

const MESSAGES_DIR = join(__dirname, '..', '..', 'messages');

/** The `itemDetail` keys the item page shows that every locale must translate. */
const ITEM_DETAIL_KEYS = [
	'RATING',
	'COMMENTS_PLACEHOLDER',
	'COMMENTS_SHORTCUT',
	'COMMENTS_POST',
	'COMMENTS_POSTING',
	'COMMENTS_SAVING',
	'COMMENTS_DELETING',
	'COMMENTS_DELETE_TITLE',
	'COMMENTS_DELETE_WARNING',
	'COMMENTS_DELETE_FAILED',
	'COMMENTS_POSTED_SUCCESS',
	'COMMENTS_POST_FAILED',
	'COMMENTS_UPDATED_SUCCESS',
	'COMMENTS_UPDATE_FAILED',
	'COMMENTS_DELETED_SUCCESS',
	'COMMENTS_SIGN_IN_PROMPT',
	'COMMENTS_EMPTY',
	'COMMENTS_HAVE_THOUGHTS'
];

function itemDetail(file: string): Record<string, unknown> {
	const messages = JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8')) as Record<string, unknown>;
	return (messages.itemDetail ?? {}) as Record<string, unknown>;
}

/** One file per supported locale (`lib/i18n/locales.ts`), so a missing locale file fails instead of being skipped. */
function otherLocaleFiles(): string[] {
	return LOCALES.filter((locale) => locale !== 'en').map((locale) => `${locale}.json`);
}

describe('item page rating and comment strings', () => {
	it('checks one messages file per supported locale besides en.json', () => {
		const onDisk = readdirSync(MESSAGES_DIR).filter((file) => file.endsWith('.json') && file !== 'en.json');
		assert.equal(otherLocaleFiles().length, 20, 'expected 20 supported locales besides en');
		assert.deepEqual([...onDisk].sort(), [...otherLocaleFiles()].sort(), 'messages/*.json does not match LOCALES');
	});

	it('has every key in en.json', () => {
		const english = itemDetail('en.json');
		for (const key of ITEM_DETAIL_KEYS) {
			const value = english[key];
			assert.ok(typeof value === 'string' && value.trim().length > 0, `en.json: itemDetail.${key} is missing`);
		}
	});

	it('translates every key in each locale file', () => {
		const english = itemDetail('en.json');
		const untranslated: string[] = [];
		for (const file of otherLocaleFiles()) {
			// Each file on its own: request.ts merges en.json under each locale at runtime, which would hide a gap.
			const messages = itemDetail(file);
			for (const key of ITEM_DETAIL_KEYS) {
				const value = messages[key];
				assert.ok(
					typeof value === 'string' && value.trim().length > 0,
					`${file}: itemDetail.${key} is missing or empty`
				);
				if (value === english[key]) {
					untranslated.push(`${file}: itemDetail.${key}`);
				}
			}
		}
		assert.deepEqual(untranslated, [], `still English:\n${untranslated.join('\n')}`);
	});

	it('keeps the keyboard shortcut in COMMENTS_SHORTCUT', () => {
		for (const file of ['en.json', ...otherLocaleFiles()]) {
			assert.match(
				String(itemDetail(file).COMMENTS_SHORTCUT),
				/Cmd\/Ctrl \+ Enter/,
				`${file}: itemDetail.COMMENTS_SHORTCUT lost "Cmd/Ctrl + Enter"`
			);
		}
	});
});
