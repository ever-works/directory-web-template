import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
	FAVORITE_CATEGORY_MAX_LENGTH,
	FAVORITE_ICON_URL_MAX_LENGTH,
	FAVORITE_NAME_MAX_LENGTH,
	FAVORITE_SLUG_MAX_LENGTH,
	validateFavoriteInput
} from '../favorite';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `POST /api/favorites` used to answer 500 for a malformed JSON body, store a name made of
 * spaces, store strings of any length, answer 500 for a NUL character, and answer 500 (not
 * 409) when two adds of the same item raced past the duplicate check.
 */
describe('validateFavoriteInput', () => {
	it('accepts the body the favorite button sends and keeps it unchanged', () => {
		const body = {
			itemSlug: 'awesome-tool',
			itemName: 'Awesome Tool',
			itemIconUrl: 'https://example.com/icon.png',
			itemCategory: 'productivity'
		};
		assert.deepEqual(validateFavoriteInput(body), { ok: true, value: body });
	});

	it('accepts just a slug and a name', () => {
		assert.deepEqual(validateFavoriteInput({ itemSlug: 'a', itemName: 'A' }), {
			ok: true,
			value: { itemSlug: 'a', itemName: 'A' }
		});
	});

	it('trims every string it returns', () => {
		assert.deepEqual(
			validateFavoriteInput({ itemSlug: ' a ', itemName: '  A  ', itemIconUrl: ' /i.png ', itemCategory: ' c ' }),
			{ ok: true, value: { itemSlug: 'a', itemName: 'A', itemIconUrl: '/i.png', itemCategory: 'c' } }
		);
	});

	it('requires a non-blank slug and name', () => {
		assert.deepEqual(validateFavoriteInput({ itemName: 'A' }), { ok: false, error: 'itemSlug is required' });
		assert.deepEqual(validateFavoriteInput({ itemSlug: 'a' }), { ok: false, error: 'itemName is required' });
		assert.deepEqual(validateFavoriteInput({ itemSlug: '', itemName: 'A' }), {
			ok: false,
			error: 'itemSlug is required'
		});
		assert.deepEqual(validateFavoriteInput({ itemSlug: 'a', itemName: '   ' }), {
			ok: false,
			error: 'itemName is required'
		});
	});

	it('rejects values that are not strings', () => {
		assert.equal(validateFavoriteInput({ itemSlug: 5, itemName: 'A' }).ok, false);
		assert.equal(validateFavoriteInput({ itemSlug: 'a', itemName: ['A'] }).ok, false);
		assert.equal(validateFavoriteInput({ itemSlug: 'a', itemName: 'A', itemIconUrl: 5 }).ok, false);
		assert.equal(validateFavoriteInput({ itemSlug: 'a', itemName: 'A', itemCategory: {} }).ok, false);
	});

	it('bounds every string, measured after trimming, and accepts exactly the limit', () => {
		assert.deepEqual(
			[
				FAVORITE_SLUG_MAX_LENGTH,
				FAVORITE_NAME_MAX_LENGTH,
				FAVORITE_ICON_URL_MAX_LENGTH,
				FAVORITE_CATEGORY_MAX_LENGTH
			],
			[200, 300, 2048, 200]
		);
		const base = { itemSlug: 'a', itemName: 'A' };
		const cases: [string, number][] = [
			['itemSlug', FAVORITE_SLUG_MAX_LENGTH],
			['itemName', FAVORITE_NAME_MAX_LENGTH],
			['itemIconUrl', FAVORITE_ICON_URL_MAX_LENGTH],
			['itemCategory', FAVORITE_CATEGORY_MAX_LENGTH]
		];
		for (const [field, max] of cases) {
			const tooLong = validateFavoriteInput({ ...base, [field]: 'x'.repeat(max + 1) });
			assert.deepEqual(tooLong, { ok: false, error: `${field} must be at most ${max} characters` });
			const exact = 'x'.repeat(max);
			assert.equal(validateFavoriteInput({ ...base, [field]: ` ${exact} ` }).ok, true, `${field} at the limit`);
		}
	});

	it('rejects a NUL character (Postgres text cannot store it)', () => {
		assert.deepEqual(validateFavoriteInput({ itemSlug: 'a\u0000b', itemName: 'A' }), {
			ok: false,
			error: 'itemSlug must not contain NUL characters'
		});
		assert.equal(validateFavoriteInput({ itemSlug: 'a', itemName: 'A', itemCategory: 'c\u0000' }).ok, false);
	});

	it('leaves the optional fields out when they are absent, null or blank', () => {
		const expected = { ok: true, value: { itemSlug: 'a', itemName: 'A' } };
		assert.deepEqual(validateFavoriteInput({ itemSlug: 'a', itemName: 'A', itemIconUrl: null }), expected);
		assert.deepEqual(validateFavoriteInput({ itemSlug: 'a', itemName: 'A', itemCategory: '  ' }), expected);
		assert.deepEqual(
			validateFavoriteInput({ itemSlug: 'a', itemName: 'A', itemIconUrl: undefined, itemCategory: '' }),
			expected
		);
	});

	it('rejects a body that is not a JSON object', () => {
		for (const body of [null, 5, 'text', [], undefined]) {
			assert.equal(validateFavoriteInput(body).ok, false, `${JSON.stringify(body)} was accepted`);
		}
	});
});

/**
 * The route handler imports the database and Next.js and cannot be loaded under
 * `tsx --test`, so these guards read the source.
 */
const route = readFileSync(join(__dirname, '../../../app/api/favorites/route.ts'), 'utf8').replace(/\s+/g, ' ');
const post = route.slice(route.indexOf('export async function POST('));

describe('POST /api/favorites', () => {
	it('answers 400 for a malformed JSON body', () => {
		const parse = post.indexOf('body = await request.json();');
		assert.ok(parse > 0, 'POST does not read the body into its own variable');
		const caught = post.indexOf('} catch {', parse);
		const badRequest = post.indexOf('{ status: 400 }', caught);
		assert.ok(caught > parse, 'POST does not parse the JSON body in its own try/catch');
		assert.ok(badRequest > caught && badRequest - caught < 200, 'a malformed JSON body does not answer 400');
	});

	it('validates before it touches the database and saves the cleaned values', () => {
		const validate = post.indexOf('validateFavoriteInput(body)');
		const lookup = post.indexOf('.select()');
		const save = post.indexOf('.insert(favorites)');
		assert.ok(validate > 0, 'POST does not call validateFavoriteInput');
		assert.ok(lookup > validate && save > validate, 'POST queries before it validates');
		assert.ok(post.includes('itemName: validatedData.itemName'), 'POST does not save the validated values');
	});

	it('answers 409, not 500, when a concurrent add wins the unique index', () => {
		const save = post.indexOf('.insert(favorites)');
		const conflict = post.indexOf('.onConflictDoNothing()', save);
		const returning = post.indexOf('.returning()', save);
		assert.ok(conflict > save && conflict < returning, 'the insert does not skip a conflicting row');
		const empty = post.indexOf('newFavorite.length === 0', returning);
		const conflictStatus = post.indexOf('{ status: 409 }', empty);
		assert.ok(empty > returning && conflictStatus > empty && conflictStatus - empty < 200);
	});
});
