import assert from 'node:assert/strict';
import Module from 'node:module';
import { describe, it } from 'node:test';
import Papa from 'papaparse';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Analytics CSV exports carry text that users chose: the recent-activity `user` column holds sign-up
 * emails, and an email may start with `=`, `+` or `-`. The fake repository below puts formula text in
 * several columns, so a column fed by user text later is covered as well. A cell that begins with
 * `=`, `+`, `-`, `@`, tab or CR runs as a formula when an admin opens the file in a spreadsheet app,
 * so both CSV paths of `AnalyticsExportService` (row arrays and the nested comprehensive report)
 * must prefix such cells with `'`.
 *
 * The service imports `AdminAnalyticsOptimizedRepository`, which reaches the database client on
 * import. The module graph is CommonJS under `tsx --test`, so the repository module is replaced
 * through `Module._load` and the service gets a fake repository through its constructor.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
const stubs: Record<string, unknown> = {
	'@/lib/repositories/admin-analytics-optimized.repository': { AdminAnalyticsOptimizedRepository: class {} }
};
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const { AnalyticsExportService } =
	require('../analytics-export.service') as typeof import('../analytics-export.service');
loader._load = originalLoad;

type Repository = NonNullable<ConstructorParameters<typeof AnalyticsExportService>[0]>;

const fakeRepository = {
	getUserGrowthTrends: async () => [{ month: '2026-11', users: 3, active: 2 }],
	getActivityTrends: async () => [{ day: '2026-11-17', views: 5, votes: -1, comments: 0 }],
	getTopItems: async () => [{ name: '=1+1', views: 4, votes: -2, category: '@x' }],
	getRecentActivity: async () => [
		{ type: 'comment', description: '+x', timestamp: '2026-11-17T00:00:00.000Z', user: '-x' }
	]
} as unknown as Repository;

/** Every cell of the CSV as the spreadsheet app sees it. */
const cells = (csv: string) => Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true }).data;

/** A cell a spreadsheet app would run as a formula. Plain numbers such as `-2` are data. */
const isFormulaCell = (cell: string) => /^[=+\-@\t\r]/.test(cell) && !/^[-+]?\d+(\.\d+)?$/.test(cell);

describe('AnalyticsExportService CSV escapes formula cells', () => {
	const service = new AnalyticsExportService(fakeRepository);

	it("writes the top item '=1+1' as \"'=1+1\" and keeps -2 a number", async () => {
		const { data } = await service.exportTopItems(10, { format: 'csv' });
		const rows = cells(String(data));
		assert.deepEqual(rows, [
			['name', 'views', 'votes', 'category'],
			["'=1+1", '4', '-2', "'@x"]
		]);
	});

	it('leaves no formula cell in the comprehensive report', async () => {
		const { data } = await service.exportComprehensiveReport({ format: 'csv' });
		const formulaCells = cells(String(data))
			.flat()
			.filter((cell) => isFormulaCell(cell));
		assert.deepEqual(formulaCells, [], `unescaped formula cells:\n${data}`);
		assert.match(String(data), /^summary\.topPerformingItem,'=1\+1$/m);
	});
});
