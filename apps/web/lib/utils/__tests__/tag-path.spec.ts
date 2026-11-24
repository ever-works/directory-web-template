import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tagLabel, tagPath } from '../tag-path';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The item page's sidebar built `/tags/${tag}` from the raw tag, so a tag with a
 * `/`, `?`, `#` or `%` linked to the wrong URL (or a 404).
 */
describe('tagPath', () => {
	it('keeps the path of an ordinary tag unchanged', () => {
		assert.equal(tagPath('analytics'), '/tags/analytics');
		assert.equal(tagPath('open-source'), '/tags/open-source');
	});

	it('encodes characters that would split or cut the URL', () => {
		assert.equal(tagPath('a/b'), '/tags/a%2Fb');
		assert.equal(tagPath('what?'), '/tags/what%3F');
		assert.equal(tagPath('c#'), '/tags/c%23');
		assert.equal(tagPath('100%'), '/tags/100%25');
		assert.equal(tagPath('Open Source'), '/tags/Open%20Source');
	});

	it('round-trips through decodeURIComponent', () => {
		for (const tag of ['a/b', 'what?', 'c#', '100%', 'Open Source', 'c++', 'café']) {
			const path = tagPath(tag);
			assert.ok(path);
			assert.equal(decodeURIComponent(path.slice('/tags/'.length)), tag);
		}
	});

	it('uses the id of an object tag, and its name only when there is no id', () => {
		assert.equal(tagPath({ id: 'open-source', name: 'Open Source' }), '/tags/open-source');
		assert.equal(tagPath({ name: 'Open Source' }), '/tags/Open%20Source');
		assert.equal(tagPath({ id: '', name: 'Open Source' }), '/tags/Open%20Source');
	});

	it('returns null for a tag without usable text', () => {
		assert.equal(tagPath(''), null);
		assert.equal(tagPath('   '), null);
		assert.equal(tagPath({}), null);
		assert.equal(tagPath(null), null);
		assert.equal(tagPath(undefined), null);
		assert.equal(tagPath({ id: 5 as unknown as string }), null);
	});
});

describe('tagLabel', () => {
	it('shows the name, falling back to the id', () => {
		assert.equal(tagLabel('analytics'), 'analytics');
		assert.equal(tagLabel({ id: 'open-source', name: 'Open Source' }), 'Open Source');
		assert.equal(tagLabel({ id: 'open-source' }), 'open-source');
		assert.equal(tagLabel(null), '');
	});
});
