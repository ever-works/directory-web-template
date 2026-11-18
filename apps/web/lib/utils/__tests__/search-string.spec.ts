import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toSearchString } from '../search-string';

/** Run with: `npx tsx --test apps/web/lib/utils/__tests__/search-string.spec.ts` */
describe('toSearchString', () => {
	it('encodes values and keeps repeated parameters', () => {
		assert.equal(toSearchString({ q: 'time & money', tags: ['a', 'b'] }), 'q=time+%26+money&tags=a&tags=b');
	});

	it('drops empty and missing values', () => {
		assert.equal(toSearchString({ q: '', sort: undefined, tags: [] }), '');
	});
});
