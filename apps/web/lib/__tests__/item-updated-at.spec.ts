import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import type { ItemData } from '../content';
import { itemDateMs, parseItemUpdatedAt } from '../item-updated-at';
import { parseItemYaml } from '../item-yaml';
import { buildFeedEntries, type FeedConfig } from '../seo/feeds';

/**
 * An item's `updated_at` is optional. Without it, date-fns `parse(undefined)` threw
 * "Cannot read properties of undefined (reading 'match')" and the item was dropped from
 * every listing (seen on mcpserver.ever.works: budna-mcp, kling-ai-mcp-china/global).
 * Run with: `npx tsx --test apps/web/lib/__tests__/item-updated-at.spec.ts`
 */
describe('parseItemUpdatedAt', () => {
	it('reads the data repositories\' yyyy-MM-dd HH:mm form as local time', () => {
		const date = parseItemUpdatedAt('2025-03-04 05:06');
		assert.ok(date instanceof Date);
		assert.deepEqual(
			[date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()],
			[2025, 2, 4, 5, 6]
		);
	});

	it('answers undefined, without throwing, when the date is missing or not a date', () => {
		for (const raw of [undefined, null, '', '   ', 42, {}, 'not a date', new Date(Number.NaN)]) {
			assert.equal(parseItemUpdatedAt(raw), undefined, String(raw));
		}
	});

	it('accepts an ISO timestamp, a bare date and a Date', () => {
		assert.equal(parseItemUpdatedAt('2025-03-04T05:06:00.000Z')?.toISOString(), '2025-03-04T05:06:00.000Z');
		assert.equal(parseItemUpdatedAt('2025-03-04')?.getUTCDate(), 4);
		const date = new Date('2025-03-04T05:06:00.000Z');
		assert.equal(parseItemUpdatedAt(date), date);
	});
});

describe('itemDateMs', () => {
	it('reads a Date or a rehydrated string, and gives 0 for none or an unreadable one', () => {
		const iso = '2025-03-04T05:06:00.000Z';
		assert.equal(itemDateMs(new Date(iso)), Date.parse(iso));
		assert.equal(itemDateMs(iso), Date.parse(iso));
		for (const value of [undefined, null, '', 'nope', new Date(Number.NaN)]) {
			assert.equal(itemDateMs(value), 0, String(value));
		}
	});
});

describe('the item parser', () => {
	const yamlOf = (extra: string) =>
		['name: Budna MCP', 'description: An MCP server', 'source_url: https://example.com', 'category: tools', 'tags: [mcp]', extra].join('\n');

	it('keeps an item without updated_at instead of dropping it', () => {
		const item = parseItemYaml(yamlOf('markdown: "# body"'), 'budna-mcp');
		assert.equal(item.slug, 'budna-mcp');
		assert.equal(item.name, 'Budna MCP');
		assert.deepEqual(item.tags, ['mcp']);
		assert.equal(item.updatedAt, undefined);
		assert.equal('updated_at' in item, false);
		assert.equal('markdown' in item, false);
	});

	it('parses a dated item, and drops a non-string updated_at', () => {
		assert.equal(parseItemYaml(yamlOf("updated_at: '2025-03-04 05:06'"), 'x').updatedAt?.getMinutes(), 6);
		const numeric = parseItemYaml(yamlOf('updated_at: 1700000000'), 'x');
		assert.equal(numeric.updatedAt, undefined);
		assert.equal('updated_at' in numeric, false);
	});

	it('is what parseItem uses (content.ts no longer parses the date itself)', () => {
		const source = readFileSync(join(__dirname, '../content.ts'), 'utf8');
		const parseItem = source.slice(source.indexOf('async function parseItem('), source.indexOf('async function parseTranslation('));
		assert.ok(parseItem.includes('return parseItemYaml(content, '));
		assert.doesNotMatch(source, /from 'date-fns'/);
	});
});

describe('buildFeedEntries', () => {
	const config = { siteUrl: 'https://example.com/', limit: 10 } as FeedConfig;
	const item = (slug: string, updated_at?: string) =>
		({ name: slug, slug, description: '', source_url: '', category: 'c', tags: [], updated_at }) as ItemData;

	it('sorts dated items newest first and leaves out undated ones', () => {
		const entries = buildFeedEntries(
			[item('old', '2024-01-01 10:00'), item('undated'), item('new', '2025-06-01 10:00'), item('bad', 'soon')],
			config
		);
		assert.deepEqual(
			entries.map((e) => [e.guid, e.pubDate]),
			[
				['https://example.com/items/new', '2025-06-01 10:00'],
				['https://example.com/items/old', '2024-01-01 10:00']
			]
		);
	});
});
