import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { isItemSlug, MAX_ITEM_SLUG_LENGTH } from '../../item-slug';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /items/<slug>.md` (rewritten to `app/[locale]/items/[slug]/md/route.ts`) must answer
 * the JSON 404 for a slug that cannot name an item, as it does for an unknown one. `fetchItem`
 * throws for such a slug (`Invalid slug format`, or `ENAMETOOLONG` for a very long one), so
 * without a check in the handler `/items/foo.bar.md` was a 500. The handler imports the
 * content layer and Next.js and cannot be loaded under `tsx --test`, so this guard reads the
 * source, as `comment-public-fields.spec.ts` does.
 */
const source = (relative: string) =>
	readFileSync(join(__dirname, relative), 'utf8')
		// Code only: a comment that names the check must not satisfy it.
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
		.replace(/\s+/g, ' ');

const mdRoute = source('../../../app/[locale]/items/[slug]/md/route.ts');
const itemPage = source('../../../app/[locale]/items/[slug]/page.tsx');

/** The text of the handler from `signature` up to its first `getCachedItem(` call. */
const beforeItemLookup = (src: string, signature: string) => {
	const start = src.indexOf(signature);
	assert.ok(start >= 0, `${signature} not found`);
	const lookup = src.indexOf('getCachedItem(', start);
	assert.ok(lookup > start, `getCachedItem( not found after ${signature}`);
	return src.slice(start, lookup);
};

describe('the item .md mirror answers 404 for a slug that cannot name an item', () => {
	it('the slug helpers reject the slugs fetchItem throws for', () => {
		assert.equal(MAX_ITEM_SLUG_LENGTH, 255);
		assert.equal(isItemSlug('foo.bar'), false);
		assert.equal(isItemSlug('..'), false);
		assert.equal(isItemSlug('a b'), false);
		assert.equal(isItemSlug('some-item_2'), true);
	});

	it('the route imports isItemSlug and the length limit from lib/item-slug', () => {
		assert.match(
			mdRoute,
			/import \{[^}]*\bisItemSlug\b[^}]*\} from '@\/lib\/item-slug'/,
			'md/route.ts does not import isItemSlug from @/lib/item-slug'
		);
		assert.match(
			mdRoute,
			/import \{[^}]*\bMAX_ITEM_SLUG_LENGTH\b[^}]*\} from '@\/lib\/item-slug'/,
			'md/route.ts does not import MAX_ITEM_SLUG_LENGTH from @/lib/item-slug'
		);
	});

	it('GET checks the slug length and form before getCachedItem, and answers the JSON 404', () => {
		const guard = beforeItemLookup(mdRoute, 'export async function GET(');
		assert.ok(guard.includes('slug.length > MAX_ITEM_SLUG_LENGTH'), 'GET does not check the slug length first');
		assert.ok(guard.includes('!isItemSlug(slug)'), 'GET does not check the slug form first');
		assert.ok(
			guard.includes("return NextResponse.json({ error: 'Not found' }, { status: 404 });"),
			'GET does not answer the JSON 404 for a slug that cannot name an item'
		);
	});

	it('the item page rejects the same slugs before its lookup', () => {
		const guard = beforeItemLookup(itemPage, 'export default async function ItemDetails(');
		assert.ok(
			guard.includes('slug.length > MAX_ITEM_SLUG_LENGTH || !isItemSlug(slug)'),
			'the item page no longer rejects the slugs the mirror rejects'
		);
	});
});
