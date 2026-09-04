import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../drizzle';
import { subscriptions, users } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Payment-report queries (Spec 047).
 *
 * The report reads the payment records the template already stores — the
 * `subscriptions` table, which carries plan, provider, status, amount, currency
 * and invoice ids — rather than pulling from a provider API. That keeps the
 * report available for every configured provider at once (Stripe, Polar,
 * LemonSqueezy, Solidgate) and keeps the export deterministic and offline.
 */

export interface PaymentReportFilters {
	/** Inclusive lower bound on `subscriptions.created_at` (ISO date or datetime). */
	from?: string;
	/** Inclusive upper bound on `subscriptions.created_at` (ISO date or datetime). */
	to?: string;
	planId?: string;
	status?: string;
	provider?: string;
	search?: string;
}

export interface PaymentReportListParams extends PaymentReportFilters {
	page?: number;
	limit?: number;
}

export interface PaymentReportRecord {
	id: string;
	userId: string;
	userEmail: string | null;
	planId: string;
	status: string;
	paymentProvider: string;
	subscriptionId: string | null;
	invoiceId: string | null;
	amount: number | null;
	amountPaid: number | null;
	amountDue: number | null;
	currency: string | null;
	interval: string | null;
	startDate: Date | null;
	endDate: Date | null;
	cancelledAt: Date | null;
	createdAt: Date;
}

export interface PaymentReportListResult {
	records: PaymentReportRecord[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface PaymentReportSummary {
	transactions: number;
	/** Sum of `amount_paid` (falling back to `amount`) grouped by currency, smallest unit. */
	totalsByCurrency: Array<{ currency: string; amount: number; transactions: number }>;
	byPlan: Array<{ planId: string; transactions: number; amount: number }>;
	byProvider: Array<{ provider: string; transactions: number; amount: number }>;
	byStatus: Array<{ status: string; transactions: number; amount: number }>;
}

/**
 * Parse a caller-supplied date bound. Returns `null` for an absent value and
 * throws for a malformed one so the route can answer 400 rather than silently
 * dropping the filter (a dropped bound would widen the report, not narrow it).
 */
export function parseReportDate(value: string | undefined | null, boundary: 'from' | 'to'): Date | null {
	if (!value) return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`Invalid ${boundary} date: ${value}`);
	}

	// A bare `YYYY-MM-DD` upper bound must include the whole day, otherwise a
	// report "to 2026-01-31" silently drops everything charged that day.
	if (boundary === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		parsed.setUTCHours(23, 59, 59, 999);
	}

	return parsed;
}

/** Amount actually collected for a row: `amount_paid` when set, else `amount`. */
const PAID_AMOUNT = sql<number>`coalesce(nullif(${subscriptions.amountPaid}, 0), ${subscriptions.amount}, 0)`;

async function buildWhere(filters: PaymentReportFilters): Promise<SQL | undefined> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const conditions: SQL[] = [eq(subscriptions.tenantId, tenantId)];

	const from = parseReportDate(filters.from, 'from');
	if (from) conditions.push(gte(subscriptions.createdAt, from));

	const to = parseReportDate(filters.to, 'to');
	if (to) conditions.push(lte(subscriptions.createdAt, to));

	if (filters.planId) conditions.push(eq(subscriptions.planId, filters.planId));
	if (filters.status) conditions.push(eq(subscriptions.status, filters.status));
	if (filters.provider) conditions.push(eq(subscriptions.paymentProvider, filters.provider));

	const search = filters.search?.trim();
	if (search) {
		const term = `%${search}%`;
		const searchCondition = or(
			ilike(users.email, term),
			ilike(subscriptions.subscriptionId, term),
			ilike(subscriptions.invoiceId, term),
			ilike(subscriptions.customerId, term)
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	return and(...conditions);
}

/** Paginated payment records matching the filters, newest first. */
export async function listPaymentRecords(params: PaymentReportListParams = {}): Promise<PaymentReportListResult> {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(200, Math.max(1, params.limit ?? 20));
	const offset = (page - 1) * limit;
	const where = await buildWhere(params);

	const records = await db
		.select({
			id: subscriptions.id,
			userId: subscriptions.userId,
			userEmail: users.email,
			planId: subscriptions.planId,
			status: subscriptions.status,
			paymentProvider: subscriptions.paymentProvider,
			subscriptionId: subscriptions.subscriptionId,
			invoiceId: subscriptions.invoiceId,
			amount: subscriptions.amount,
			amountPaid: subscriptions.amountPaid,
			amountDue: subscriptions.amountDue,
			currency: subscriptions.currency,
			interval: subscriptions.interval,
			startDate: subscriptions.startDate,
			endDate: subscriptions.endDate,
			cancelledAt: subscriptions.cancelledAt,
			createdAt: subscriptions.createdAt
		})
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(where)
		.orderBy(desc(subscriptions.createdAt))
		.limit(limit)
		.offset(offset);

	const [totalRow] = await db
		.select({ value: count() })
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(where);

	const total = totalRow?.value ?? 0;

	return {
		records,
		total,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit))
	};
}

/**
 * Every record matching the filters, for the export path. Capped so a bad filter
 * can never stream an unbounded result set into memory.
 */
export async function listAllPaymentRecords(
	filters: PaymentReportFilters,
	maxRows = 10_000
): Promise<PaymentReportRecord[]> {
	const result = await listPaymentRecords({ ...filters, page: 1, limit: Math.min(200, maxRows) });
	const records = [...result.records];

	const pages = Math.min(result.totalPages, Math.ceil(maxRows / result.limit));
	for (let page = 2; page <= pages; page += 1) {
		const next = await listPaymentRecords({ ...filters, page, limit: result.limit });
		records.push(...next.records);
		if (records.length >= maxRows) break;
	}

	return records.slice(0, maxRows);
}

/** Revenue roll-ups for the same filter set the list uses. */
export async function summarizePayments(filters: PaymentReportFilters = {}): Promise<PaymentReportSummary> {
	const where = await buildWhere(filters);

	const [byCurrency, byPlan, byProvider, byStatus] = await Promise.all([
		db
			.select({
				currency: sql<string>`coalesce(${subscriptions.currency}, 'usd')`,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(sql`coalesce(${subscriptions.currency}, 'usd')`),
		db
			.select({
				planId: subscriptions.planId,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(subscriptions.planId),
		db
			.select({
				provider: subscriptions.paymentProvider,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(subscriptions.paymentProvider),
		db
			.select({
				status: subscriptions.status,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(subscriptions.status)
	]);

	const toNumber = <T extends { amount: number; transactions: number }>(row: T): T => ({
		...row,
		amount: Number(row.amount ?? 0),
		transactions: Number(row.transactions ?? 0)
	});

	const totalsByCurrency = byCurrency.map(toNumber);

	return {
		transactions: totalsByCurrency.reduce((sum, row) => sum + row.transactions, 0),
		totalsByCurrency,
		byPlan: byPlan.map(toNumber),
		byProvider: byProvider.map(toNumber),
		byStatus: byStatus.map(toNumber)
	};
}
