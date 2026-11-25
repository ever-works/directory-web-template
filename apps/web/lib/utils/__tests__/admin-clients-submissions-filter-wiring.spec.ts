import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * GET /api/admin/clients/advanced-search read `minSubmissions` / `maxSubmissions` with a local
 * `parseIntSafe` (`Number(v)` then `Math.floor`): `?maxSubmissions=` filtered to clients with 0
 * submissions, `0x10` was 16, and `3000000000` reached Postgres past the integer column and answered
 * 500. The route imports the DB layer, which cannot load under `tsx --test`, so this guard reads the
 * source; the parsing rules are checked on the helper in `non-negative-int-param.spec.ts`.
 */
const routePath = join(__dirname, '../../../app/api/admin/clients/advanced-search/route.ts');
const source = readFileSync(routePath, 'utf8').replace(/\s+/g, ' ');

describe('admin clients advanced-search submissions filter wiring', () => {
	it('parses minSubmissions and maxSubmissions with parseNonNegativeIntParam', () => {
		assert.ok(source.includes("from '@/lib/utils/non-negative-int-param'"), 'helper is not imported');
		for (const name of ['minSubmissions', 'maxSubmissions']) {
			assert.ok(
				source.includes(`parseNonNegativeIntParam(searchParams.get('${name}'))`),
				`${name} is not parsed with the shared helper`
			);
		}
	});

	it('no longer reads the filters with Number(v)', () => {
		assert.ok(!source.includes('Number(v)'), 'a filter is still read with Number(v)');
		assert.ok(!source.includes('parseIntSafe'), 'the loose parseIntSafe parser is still there');
	});

	it('answers 400 for an invalid value before searching, and documents the 400', () => {
		const message = source.indexOf('parameter. Must be a whole number between 0 and');
		assert.ok(message > 0, 'no 400 message for an invalid submissions filter');
		assert.ok(source.includes('{ status: 400 }'), 'no 400 response');
		const search = source.indexOf('await advancedClientSearch(');
		assert.ok(search > 0, 'advancedClientSearch call not found');
		const handler = source.indexOf('export async function GET');
		const checks = ['minSubmissions', 'maxSubmissions'].map((name) =>
			source.indexOf(`return invalidSubmissionsParam('${name}')`, handler)
		);
		for (const check of checks) {
			assert.ok(check > handler && check < search, 'the 400 is not returned before advancedClientSearch runs');
		}
		assert.match(source, /\* 400: \* description: "Bad request - invalid minSubmissions or maxSubmissions"/);
	});
});
