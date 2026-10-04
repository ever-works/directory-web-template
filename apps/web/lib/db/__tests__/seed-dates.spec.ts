import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { faker } from '@faker-js/faker';

import { DAY_MS, futureWithin, HOUR_MS, YEAR_MS } from '../seed-dates';

// E2E on main (run 37110291264, 2026-10-03): all 4 Playwright shards failed because the demo
// seed called faker v10's `date.future({ years: 0.1 })`, which throws for a fractional year, so
// the web server's instrumentation hook never finished.

test('the short seed horizons (~18 h, ~3.65 days, ~36.5 days) all yield a date inside the window', () => {
	for (const horizon of [0.002 * YEAR_MS, 0.01 * YEAR_MS, 0.1 * YEAR_MS, 2 * HOUR_MS, DAY_MS]) {
		for (let i = 0; i < 200; i++) {
			const before = Date.now();
			const value = futureWithin(faker, horizon).getTime();
			const after = Date.now();
			assert.ok(value >= before + 1000, `${value} is not in the future (horizon ${horizon})`);
			assert.ok(value <= after + horizon, `${value} is past the horizon ${horizon}`);
		}
	}
});

test('a horizon of one second or less is a caller bug, not a silent past date', () => {
	for (const horizon of [0, 1000, -5, Number.NaN]) {
		assert.throws(() => futureWithin(faker, horizon), /longer than one second/);
	}
});

test('the seed passes no fractional years or days to faker date helpers', () => {
	const seed = readFileSync(join(__dirname, '../seed.ts'), 'utf8');
	const fractional = seed.match(/faker\.date\.(future|past|soon|recent)\(\{\s*(years|days):\s*\d*\.\d+/g) ?? [];
	assert.deepEqual(fractional, []);
});
