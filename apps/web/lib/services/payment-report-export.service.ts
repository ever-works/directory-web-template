import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import type { PaymentReportRecord, PaymentReportSummary } from '@/lib/db/queries/payment-report.queries';

/**
 * Payment-report export (Spec 047).
 *
 * CSV and XLSX only. The repository carries no PDF generation dependency
 * (`exceljs` + `papaparse` are the only document libraries in
 * `apps/web/package.json`), and Article VII of the constitution says reuse
 * before build — adding a PDF engine is a separate, dependency-bearing decision
 * recorded in `docs/questions.md`. `SUPPORTED_EXPORT_FORMATS` is the single
 * place to extend when that decision lands.
 */

export const SUPPORTED_EXPORT_FORMATS = ['csv', 'xlsx'] as const;
export type PaymentReportExportFormat = (typeof SUPPORTED_EXPORT_FORMATS)[number];

export function isSupportedExportFormat(value: string): value is PaymentReportExportFormat {
	return (SUPPORTED_EXPORT_FORMATS as readonly string[]).includes(value);
}

export interface PaymentReportExportResult {
	data: string | Buffer;
	filename: string;
	contentType: string;
}

/** Column order shared by both formats, so a CSV and an XLSX of the same report match. */
const COLUMNS: Array<{ header: string; key: string; get: (record: PaymentReportRecord) => string | number }> = [
	{ header: 'Date', key: 'date', get: (r) => toIsoDate(r.createdAt) },
	{ header: 'Record ID', key: 'recordId', get: (r) => r.id },
	{ header: 'User Email', key: 'userEmail', get: (r) => r.userEmail ?? '' },
	{ header: 'User ID', key: 'userId', get: (r) => r.userId },
	{ header: 'Plan', key: 'plan', get: (r) => r.planId },
	{ header: 'Status', key: 'status', get: (r) => r.status },
	{ header: 'Provider', key: 'provider', get: (r) => r.paymentProvider },
	{ header: 'Amount', key: 'amount', get: (r) => toMajorUnits(r.amountPaid || r.amount) },
	{ header: 'Amount Due', key: 'amountDue', get: (r) => toMajorUnits(r.amountDue) },
	{ header: 'Currency', key: 'currency', get: (r) => (r.currency ?? 'usd').toUpperCase() },
	{ header: 'Interval', key: 'interval', get: (r) => r.interval ?? '' },
	{ header: 'Subscription ID', key: 'subscriptionId', get: (r) => r.subscriptionId ?? '' },
	{ header: 'Invoice ID', key: 'invoiceId', get: (r) => r.invoiceId ?? '' },
	{ header: 'Start Date', key: 'startDate', get: (r) => toIsoDate(r.startDate) },
	{ header: 'End Date', key: 'endDate', get: (r) => toIsoDate(r.endDate) },
	{ header: 'Cancelled At', key: 'cancelledAt', get: (r) => toIsoDate(r.cancelledAt) }
];

function toIsoDate(value: Date | string | null | undefined): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Amounts are stored in the smallest currency unit (cents). The export shows
 * major units so a spreadsheet sum reads as money, not as an integer count.
 */
function toMajorUnits(value: number | null | undefined): number {
	if (!value) return 0;
	return Math.round(value) / 100;
}

function timestampSuffix(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function toRows(records: PaymentReportRecord[]): Array<Record<string, string | number>> {
	return records.map((record) => {
		const row: Record<string, string | number> = {};
		for (const column of COLUMNS) row[column.header] = column.get(record);
		return row;
	});
}

/** Build the CSV body. Exported so tests can assert on it without a DB. */
export function buildPaymentReportCsv(records: PaymentReportRecord[]): string {
	return Papa.unparse(toRows(records), { columns: COLUMNS.map((column) => column.header) });
}

/** Build the XLSX workbook. A second sheet carries the summary roll-ups. */
export async function buildPaymentReportXlsx(
	records: PaymentReportRecord[],
	summary?: PaymentReportSummary
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Ever Works';
	workbook.created = new Date();

	const sheet = workbook.addWorksheet('Payments');
	sheet.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key, width: 22 }));
	sheet.getRow(1).font = { bold: true };

	for (const record of records) {
		const row: Record<string, string | number> = {};
		for (const column of COLUMNS) row[column.key] = column.get(record);
		sheet.addRow(row);
	}

	if (summary) {
		const summarySheet = workbook.addWorksheet('Summary');
		summarySheet.columns = [
			{ header: 'Group', key: 'group', width: 18 },
			{ header: 'Value', key: 'value', width: 24 },
			{ header: 'Transactions', key: 'transactions', width: 16 },
			{ header: 'Amount', key: 'amount', width: 18 }
		];
		summarySheet.getRow(1).font = { bold: true };

		for (const row of summary.totalsByCurrency) {
			summarySheet.addRow({
				group: 'Currency',
				value: row.currency.toUpperCase(),
				transactions: row.transactions,
				amount: toMajorUnits(row.amount)
			});
		}
		for (const row of summary.byPlan) {
			summarySheet.addRow({
				group: 'Plan',
				value: row.planId,
				transactions: row.transactions,
				amount: toMajorUnits(row.amount)
			});
		}
		for (const row of summary.byProvider) {
			summarySheet.addRow({
				group: 'Provider',
				value: row.provider,
				transactions: row.transactions,
				amount: toMajorUnits(row.amount)
			});
		}
		for (const row of summary.byStatus) {
			summarySheet.addRow({
				group: 'Status',
				value: row.status,
				transactions: row.transactions,
				amount: toMajorUnits(row.amount)
			});
		}
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

/**
 * Render a payment report in the requested format, ready to hand to a
 * `NextResponse` with a `Content-Disposition` attachment header.
 */
export async function exportPaymentReport(
	format: PaymentReportExportFormat,
	records: PaymentReportRecord[],
	summary?: PaymentReportSummary
): Promise<PaymentReportExportResult> {
	const stamp = timestampSuffix();

	if (format === 'xlsx') {
		return {
			data: await buildPaymentReportXlsx(records, summary),
			filename: `payment-report-${stamp}.xlsx`,
			contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		};
	}

	return {
		data: buildPaymentReportCsv(records),
		filename: `payment-report-${stamp}.csv`,
		contentType: 'text/csv; charset=utf-8'
	};
}
