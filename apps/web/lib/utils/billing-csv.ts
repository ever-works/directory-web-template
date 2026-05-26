// Client-side CSV export for billing payment history.
// Pure browser helpers — no server round-trip needed since the payment list
// is already loaded in the client.

export interface ExportablePayment {
	id: string;
	date: string;
	amount: number;
	currency: string;
	plan: string;
	status: string;
	billingInterval: string;
	paymentProvider: string;
	subscriptionId: string;
	description: string;
	invoiceNumber?: string | null;
}

/** Escape a single CSV field per RFC 4180 (quote when it contains a comma,
 *  quote, or newline; double internal quotes). */
function csvField(value: unknown): string {
	const s = value == null ? '' : String(value);
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS: { header: string; get: (p: ExportablePayment) => unknown }[] = [
	{ header: 'Date', get: (p) => p.date },
	{ header: 'Plan', get: (p) => p.plan },
	{ header: 'Description', get: (p) => p.description },
	{ header: 'Amount', get: (p) => p.amount },
	{ header: 'Currency', get: (p) => p.currency },
	{ header: 'Status', get: (p) => p.status },
	{ header: 'Billing Interval', get: (p) => p.billingInterval },
	{ header: 'Provider', get: (p) => p.paymentProvider },
	{ header: 'Invoice Number', get: (p) => p.invoiceNumber ?? '' },
	{ header: 'Subscription ID', get: (p) => p.subscriptionId },
	{ header: 'Payment ID', get: (p) => p.id }
];

export function paymentsToCsv(payments: ExportablePayment[]): string {
	const header = COLUMNS.map((c) => csvField(c.header)).join(',');
	const rows = payments.map((p) => COLUMNS.map((c) => csvField(c.get(p))).join(','));
	return [header, ...rows].join('\r\n');
}

/** Trigger a client-side download of the given text as a file. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
	if (typeof window === 'undefined') return;
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/** Export a payment list as a timestamped CSV download. Returns the row count. */
export function exportPaymentsCsv(payments: ExportablePayment[], filenamePrefix = 'billing-payments'): number {
	const stamp = new Date().toISOString().slice(0, 10);
	downloadTextFile(`${filenamePrefix}-${stamp}.csv`, paymentsToCsv(payments));
	return payments.length;
}
