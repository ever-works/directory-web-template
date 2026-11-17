import { escapeCsvFormula } from '@/lib/utils/csv-formula';

export interface SurveyCSVResponse {
	id: string;
	userId?: string | null;
	completedAt?: string | Date | null;
	data?: Record<string, unknown>;
}

/**
 * One CSV cell. Objects are JSON-stringified; a cell a spreadsheet app would run as a formula gets a
 * leading `'` (anyone can answer a published survey with any keys and values); then RFC 4180
 * quoting.
 */
function surveyCsvCell(val: unknown): string {
	if (val === null || val === undefined) return '';
	let s: unknown = val;
	if (typeof s === 'object') {
		try {
			s = JSON.stringify(s);
		} catch {
			s = String(s);
		}
	}
	const str = escapeCsvFormula(String(s));
	return /[,"\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * The CSV text of survey responses (no BOM): a `Response ID`, `User ID`, `Completed At` header
 * followed by every answer key, sorted, then one row per response.
 */
export function buildSurveyResponsesCsv(responses: SurveyCSVResponse[]): string {
	const allKeys = new Set<string>();
	for (const r of responses) {
		const data = r?.data ?? {};
		Object.keys(data).forEach((k) => allKeys.add(k));
	}
	const keys = Array.from(allKeys).sort();
	const header = ['Response ID', 'User ID', 'Completed At', ...keys].map(surveyCsvCell).join(',');
	const rows: string[] = [header];
	for (const r of responses) {
		const completed = r?.completedAt ? new Date(r.completedAt).toISOString() : '';
		rows.push(
			[
				surveyCsvCell(r.id),
				surveyCsvCell(r.userId ?? 'Anonymous'),
				surveyCsvCell(completed),
				...keys.map((k) => surveyCsvCell(r?.data?.[k]))
			].join(',')
		);
	}
	return rows.join('\r\n');
}
