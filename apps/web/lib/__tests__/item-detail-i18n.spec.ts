import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { LOCALES } from '../i18n/locales';

/**
 * The item page's labels, rating and comment strings (`itemDetail.*` and `common.COMMENTS` in `messages/*.json`).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `itemDetail.RATING` heads the rating block (`components/item-detail/rating-display.tsx`), labels the rating picker in
 * the comment form and names the star picker for screen readers (`components/ui/rating.tsx`). The `COMMENTS_*` keys are
 * the comment box, its buttons, the delete dialog, the toasts and the profile button on a comment's author card
 * (`components/item-detail/comments-section.tsx`), and `common.COMMENTS` heads the comments section.
 * `itemDetail.INFORMATION` and `itemDetail.PUBLISHER` head the Information block and label the publisher
 * (`components/item-detail/item-detail.tsx`); `itemDetail.STATS_VOTES` is the vote stat
 * (`components/item-detail/item-stats-section.tsx`).
 * These keys were left in English in the other locale files. `i18n/request.ts` merges en.json under each locale, so a
 * key left in English renders English and nothing fails; this spec reads each file on its own instead.
 */

const MESSAGES_DIR = join(__dirname, '..', '..', 'messages');
const COMMENTS_SECTION = join(__dirname, '..', '..', 'components', 'item-detail', 'comments-section.tsx');

/** The keys the item page shows that every locale must translate, by top-level section of `messages/*.json`. */
const ITEM_PAGE_KEYS: Record<string, string[]> = {
	common: ['COMMENTS'],
	itemDetail: [
		'RATING',
		'INFORMATION',
		'PUBLISHER',
		'STATS_VOTES',
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
		'COMMENTS_HAVE_THOUGHTS',
		'COMMENTS_VIEW_PROFILE',
		'COMMENTS_PROFILE'
	]
};

function section(file: string, name: string): Record<string, unknown> {
	const messages = JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8')) as Record<string, unknown>;
	return (messages[name] ?? {}) as Record<string, unknown>;
}

function itemDetail(file: string): Record<string, unknown> {
	return section(file, 'itemDetail');
}

/** One file per supported locale (`lib/i18n/locales.ts`), so a missing locale file fails instead of being skipped. */
function otherLocaleFiles(): string[] {
	return LOCALES.filter((locale) => locale !== 'en').map((locale) => `${locale}.json`);
}

describe('item page labels, rating and comment strings', () => {
	it('checks one messages file per supported locale besides en.json', () => {
		const onDisk = readdirSync(MESSAGES_DIR).filter((file) => file.endsWith('.json') && file !== 'en.json');
		assert.equal(otherLocaleFiles().length, 20, 'expected 20 supported locales besides en');
		assert.deepEqual([...onDisk].sort(), [...otherLocaleFiles()].sort(), 'messages/*.json does not match LOCALES');
	});

	it('has every key in en.json', () => {
		for (const [name, keys] of Object.entries(ITEM_PAGE_KEYS)) {
			const english = section('en.json', name);
			for (const key of keys) {
				const value = english[key];
				assert.ok(typeof value === 'string' && value.trim().length > 0, `en.json: ${name}.${key} is missing`);
			}
		}
	});

	it('translates every key in each locale file', () => {
		const untranslated: string[] = [];
		for (const [name, keys] of Object.entries(ITEM_PAGE_KEYS)) {
			const english = section('en.json', name);
			for (const file of otherLocaleFiles()) {
				// Each file on its own: request.ts merges en.json under each locale at runtime, which would hide a gap.
				const messages = section(file, name);
				for (const key of keys) {
					const value = messages[key];
					assert.ok(
						typeof value === 'string' && value.trim().length > 0,
						`${file}: ${name}.${key} is missing or empty`
					);
					if (value === english[key]) {
						untranslated.push(`${file}: ${name}.${key}`);
					}
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

	it('labels the profile button on a comment from the messages, not hard-coded English', () => {
		const source = readFileSync(COMMENTS_SECTION, 'utf8');
		assert.doesNotMatch(
			source,
			/["']View profile["']/,
			'comments-section.tsx still has the "View profile" literal'
		);
		assert.doesNotMatch(source, />\s*Profile\s*</, 'comments-section.tsx still renders the "Profile" text in JSX');
		assert.match(
			source,
			/\('COMMENTS_VIEW_PROFILE'\)/,
			'comments-section.tsx does not use itemDetail.COMMENTS_VIEW_PROFILE'
		);
		assert.match(source, /\('COMMENTS_PROFILE'\)/, 'comments-section.tsx does not use itemDetail.COMMENTS_PROFILE');
	});
});
