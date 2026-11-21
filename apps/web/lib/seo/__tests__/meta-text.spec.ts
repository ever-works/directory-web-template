import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	firstDescription,
	itemDescription,
	itemTitle,
	listNames,
	plainText,
	taxonomyDescription,
	taxonomyTitle,
	toMetaDescription
} from '../meta-text';

/**
 * Titles and meta descriptions built from directory data (lib/seo/meta-text.ts, Spec 062).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

describe('toMetaDescription', () => {
	it('keeps short text as is (plain text)', () => {
		assert.equal(toMetaDescription('A **fast** [time tracker](https://x.test).'), 'A fast time tracker.');
		assert.equal(toMetaDescription('<p>Hello <b>world</b></p>'), 'Hello world');
		assert.equal(toMetaDescription('## Intro\n\nAn *easy* tool.'), 'Intro An easy tool.');
		assert.equal(toMetaDescription(undefined), '');
	});

	it('leaves code-ish text alone (C#, snake_case, comparisons)', () => {
		assert.equal(toMetaDescription('C# and F# tools for snake_case fans; 2 < 3 > 1'), 'C# and F# tools for snake_case fans; 2 < 3 > 1');
	});

	it('cuts long text on a word boundary under the limit, with an ellipsis', () => {
		const long = 'word '.repeat(60);
		const description = toMetaDescription(long);
		assert.ok(description.length <= 155, String(description.length));
		assert.ok(description.endsWith('word…'));
		assert.ok(!description.includes('wor…'));
	});

	it('cuts a single huge word hard', () => {
		const description = toMetaDescription('x'.repeat(400), 20);
		assert.equal(description, `${'x'.repeat(19)}…`);
	});

	it('firstDescription skips blank candidates', () => {
		assert.equal(firstDescription('', '   ', null, 'Third'), 'Third');
	});
});

describe('taxonomy titles and descriptions', () => {
	it('names the category with the directory noun and count', () => {
		assert.equal(taxonomyTitle({ name: 'Time Tracking', itemsName: 'Tools', count: 42 }), 'Time Tracking Tools (42)');
		assert.equal(taxonomyTitle({ name: 'Developer Tools', itemsName: 'Tools', count: 3 }), 'Developer Tools (3)');
		assert.equal(taxonomyTitle({ name: 'AI', itemsName: '', count: 0 }), 'AI Items (0)');
	});

	it('prefers the record description, else a factual sentence with sample names', () => {
		assert.equal(
			taxonomyDescription({ name: 'AI', itemsName: 'Tools', count: 2, siteName: 'X', description: 'All AI things.' }),
			'All AI things.'
		);
		assert.equal(
			taxonomyDescription({
				name: 'Time Tracking',
				itemsName: 'Tools',
				count: 12,
				siteName: 'Awesome Time',
				sampleNames: ['Toggl', 'Kimai', 'Clockify', 'Harvest']
			}),
			'Browse 12 tools in Time Tracking on Awesome Time: Toggl, Kimai, Clockify and more.'
		);
	});
});

describe('item titles and descriptions', () => {
	it('adds the category to the item name unless it repeats it', () => {
		assert.equal(itemTitle({ name: 'Toggl', category: 'Time Tracking' }), 'Toggl – Time Tracking');
		assert.equal(itemTitle({ name: 'Toggl', category: '' }), 'Toggl');
		assert.equal(itemTitle({ name: 'Notes', category: 'notes' }), 'Notes');
	});

	it('uses the item description, else a factual fallback', () => {
		assert.equal(itemDescription({ name: 'Toggl', siteName: 'X', description: 'Simple.' }), 'Simple.');
		assert.equal(
			itemDescription({ name: 'Toggl', category: 'Time Tracking', siteName: 'Awesome Time' }),
			'Details and links for Toggl, listed in Time Tracking on Awesome Time.'
		);
	});
});

describe('helpers', () => {
	it('listNames', () => {
		assert.equal(listNames([]), '');
		assert.equal(listNames(['A']), 'A');
		assert.equal(listNames(['A', 'B']), 'A and B');
		assert.equal(listNames(['A', 'B', 'C']), 'A, B and C');
	});

	it('plainText ignores non-strings', () => {
		assert.equal(plainText(12), '');
		assert.equal(plainText('  a\n\nb  '), 'a b');
	});
});
