import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tagPath } from '../../utils/tag-path';
import { decodeSegment, findTagByParam, findTagBySegment } from '../route-segment';

/**
 * Route-segment helpers (lib/seo/route-segment.ts).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

describe('decodeSegment', () => {
	it('percent-decodes a segment', () => {
		assert.equal(decodeSegment('open-source'), 'open-source');
		assert.equal(decodeSegment('Open%20Source'), 'Open Source');
		assert.equal(decodeSegment('a%2Fb'), 'a/b');
	});

	it('returns null for malformed percent-encoding instead of throwing', () => {
		assert.equal(decodeSegment('%E0%A4%A'), null);
		assert.equal(decodeSegment('100%'), null);
	});

	it('returns null for a missing segment', () => {
		assert.equal(decodeSegment(undefined), null);
		assert.equal(decodeSegment(null), null);
	});
});

describe('findTagBySegment', () => {
	const tags = [{ id: 'tag-a', name: 'Tag A' }, { id: 'tag-b', name: null }, { id: 'tag-c' }];

	it('finds a tag by its id', () => {
		assert.equal(findTagBySegment(tags, 'tag-a')?.id, 'tag-a');
		assert.equal(findTagBySegment(tags, 'tag-c')?.id, 'tag-c');
	});

	it('finds a tag by its display name in any case', () => {
		assert.equal(findTagBySegment(tags, 'Tag A')?.id, 'tag-a');
		assert.equal(findTagBySegment(tags, 'TAG A')?.id, 'tag-a');
	});

	it('does not match an id in another case', () => {
		assert.equal(findTagBySegment(tags, 'TAG-A'), undefined);
	});

	it('prefers an exact id over the display name of another tag', () => {
		// An EARLIER tag named like a LATER tag's id must not shadow it: /tags/<id>
		// would otherwise list and canonicalise to the wrong tag.
		const shadowing = [{ id: 'editors-pick', name: 'Popular' }, { id: 'popular', name: 'Most Popular' }];
		assert.equal(findTagBySegment(shadowing, 'popular')?.id, 'popular');
		assert.equal(findTagBySegment(shadowing, 'Popular')?.id, 'editors-pick');
	});

	it('finds nothing for an unknown segment', () => {
		assert.equal(findTagBySegment(tags, 'zz-unknown'), undefined);
		assert.equal(findTagBySegment([], 'tag-a'), undefined);
	});
});

/**
 * The route boundary: a link built by `tagPath()` (the item page's sidebar) must reach the
 * tag it names whether `params.tag` arrives percent-encoded or already decoded.
 */
describe('findTagByParam', () => {
	const tags = [
		{ id: '100%', name: 'Hundred' },
		{ id: 'a b', name: 'Spaced' },
		{ id: 'a/b', name: 'Slashed' },
		{ id: 'c#', name: 'Sharp' },
		{ id: 'open-source', name: 'Open Source' }
	];

	for (const tag of tags) {
		const segment = tagPath(tag.id)!.slice('/tags/'.length);

		it(`reaches "${tag.id}" from an encoded param (${segment})`, () => {
			assert.equal(findTagByParam(tags, segment)?.id, tag.id);
		});

		it(`reaches "${tag.id}" from an already-decoded param`, () => {
			assert.equal(findTagByParam(tags, tag.id)?.id, tag.id);
		});
	}

	it('does not decode a tag whose own text looks like an escape into another tag', () => {
		// A tag literally named `a%20b` next to a tag `a b`: an already-decoded param `a%20b`
		// is the literal tag (as given first), not decoded again into `a b`.
		const literal = [{ id: 'a b' }, { id: 'a%20b' }];
		assert.equal(findTagByParam(literal, 'a%20b')?.id, 'a%20b');
		// Its encoded form (what tagPath() links to) still reaches it.
		assert.equal(findTagByParam(literal, tagPath('a%20b')!.slice('/tags/'.length))?.id, 'a%20b');
		// Alone, the literal tag is reached from both conventions.
		assert.equal(findTagByParam([{ id: 'a%20b' }], 'a%2520b')?.id, 'a%20b');
		assert.equal(findTagByParam([{ id: 'a%20b' }], 'a%20b')?.id, 'a%20b');
	});

	it('keeps the old results for display names, any case, and unknown tags', () => {
		assert.equal(findTagByParam(tags, 'Open%20Source')?.id, 'open-source');
		assert.equal(findTagByParam(tags, 'open source')?.id, 'open-source');
		assert.equal(findTagByParam(tags, 'zz-unknown'), undefined);
	});

	it('does not throw on malformed percent-encoding', () => {
		assert.equal(findTagByParam(tags, '%E0%A4%A'), undefined);
		assert.equal(findTagByParam([], '100%'), undefined);
	});
});
