import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeCsvFormula } from '../csv-formula';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A CSV cell that begins with `=`, `+`, `-`, `@`, tab or CR runs as a formula when the file is
 * opened in a spreadsheet app. `escapeCsvFormula` prefixes such a cell with `'` so the app shows
 * it as text, and leaves plain numbers and ordinary text alone.
 */
describe('escapeCsvFormula', () => {
	for (const value of ['=1+1', '+x', '-x', '@x', '\t=1+1', '\r=1+1', '=x\ny', '-12.5\n=1+1']) {
		it(`prefixes ${JSON.stringify(value)} with '`, () => {
			assert.equal(escapeCsvFormula(value), `'${value}`);
		});
	}

	it("adds one more ' to a value that already starts with ' before a formula character", () => {
		assert.equal(escapeCsvFormula("'=1+1"), "''=1+1");
	});

	for (const value of ['-12.5', '+3', '42', 'abc', '', 'a=b', "it's"]) {
		it(`CONTROL: leaves ${JSON.stringify(value)} unchanged`, () => {
			assert.equal(escapeCsvFormula(value), value);
		});
	}
});
