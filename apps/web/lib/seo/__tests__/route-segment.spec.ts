import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeSegment, findTagBySegment } from '../route-segment';

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

	it('finds nothing for an unknown segment', () => {
		assert.equal(findTagBySegment(tags, 'zz-unknown'), undefined);
		assert.equal(findTagBySegment([], 'tag-a'), undefined);
	});
});
