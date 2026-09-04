import { and, count, desc, eq, gt, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	billingIssues,
	subscriptions,
	users,
	BillingIssueStatus,
	BillingIssueType,
	OPEN_BILLING_ISSUE_STATUSES,
	SubscriptionStatus,
	type BillingIssue,
	type BillingIssueStatusValues,
	type BillingIssueTypeValues,
	type NewBillingIssue
} from '../schema';
import { PaymentProvider } from '@/lib/constants/payment';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Billing-issue queries (Spec 046).
 *
 * A billing issue is an admin-workflow record layered on the payment data the
 * template already stores — it is deliberately NOT a second source of truth for
 * money. Every read joins back to `subscriptions` (plan, provider, amount) and
 * `users` (who to contact), and the refund action resolves the provider from
 * `subscriptions.payment_provider`.
 */

/** A billing issue plus the subscription / user context an admin needs to act. */
export interface BillingIssueWithContext {
	id: string;
	userId: string;
	subscriptionId: string | null;
	type: BillingIssueTypeValues;
	status: BillingIssueStatusValues;
	paymentProvider: string;
	providerPaymentId: string | null;
	amount: number | null;
	currency: string | null;
	detectionReason: string | null;
	refundId: string | null;
	refundAmount: number | null;
	refundedAt: Date | null;
	resolutionNote: string | null;
	resolvedBy: string | null;
	resolvedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	userEmail: string | null;
	planId: string | null;
	subscriptionStatus: string | null;
	failedPaymentCount: number | null;
	providerSubscriptionId: string | null;
	invoiceId: string | null;
	hostedInvoiceUrl: string | null;
}

export interface ListBillingIssuesParams {
	page?: number;
	limit?: number;
	search?: string;
	status?: BillingIssueStatusValues;
	type?: BillingIssueTypeValues;
	provider?: string;
}

export interface ListBillingIssuesResult {
	issues: BillingIssueWithContext[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface BillingIssueStats {
	total: number;
	openCount: number;
	refundedCount: number;
	resolvedCount: number;
	byStatus: Record<string, number>;
	byType: Record<string, number>;
	byProvider: Record<string, number>;
	/** Sum of `amount` over issues that are still open, in the smallest currency unit. */
	amountAtRisk: number;
}

/** Columns every list / detail read projects, so both stay in lockstep. */
const ISSUE_COLUMNS = {
	id: billingIssues.id,
	userId: billingIssues.userId,
	subscriptionId: billingIssues.subscriptionId,
	type: billingIssues.type,
	status: billingIssues.status,
	paymentProvider: billingIssues.paymentProvider,
	providerPaymentId: billingIssues.providerPaymentId,
	amount: billingIssues.amount,
	currency: billingIssues.currency,
	detectionReason: billingIssues.detectionReason,
	refundId: billingIssues.refundId,
	refundAmount: billingIssues.refundAmount,
	refundedAt: billingIssues.refundedAt,
	resolutionNote: billingIssues.resolutionNote,
	resolvedBy: billingIssues.resolvedBy,
	resolvedAt: billingIssues.resolvedAt,
	createdAt: billingIssues.createdAt,
	updatedAt: billingIssues.updatedAt,
	userEmail: users.email,
	planId: subscriptions.planId,
	subscriptionStatus: subscriptions.status,
	failedPaymentCount: subscriptions.failedPaymentCount,
	providerSubscriptionId: subscriptions.subscriptionId,
	invoiceId: subscriptions.invoiceId,
	hostedInvoiceUrl: subscriptions.hostedInvoiceUrl
} as const;

/**
 * Build the dedupe key detection uses. Keyed on the subscription plus the issue
 * type so one subscription can carry a failed-payment issue and a dispute at the
 * same time, while a re-run of detection updates rather than duplicates.
 */
export function buildBillingIssueSourceKey(subscriptionId: string, type: BillingIssueTypeValues): string {
	return `${type}:${subscriptionId}`;
}

/**
 * List billing issues, newest first, with the subscription and user context an
 * admin needs. Filters are all optional and combine with AND.
 */
export async function listBillingIssues(params: ListBillingIssuesParams = {}): Promise<ListBillingIssuesResult> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? 10));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [eq(billingIssues.tenantId, tenantId)];
	if (params.status) conditions.push(eq(billingIssues.status, params.status));
	if (params.type) conditions.push(eq(billingIssues.type, params.type));
	if (params.provider) conditions.push(eq(billingIssues.paymentProvider, params.provider));

	const search = params.search?.trim();
	if (search) {
		const term = `%${search}%`;
		const searchCondition = or(
			ilike(users.email, term),
			ilike(billingIssues.providerPaymentId, term),
			ilike(billingIssues.detectionReason, term),
			ilike(billingIssues.resolutionNote, term),
			ilike(subscriptions.subscriptionId, term)
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	const where = and(...conditions);

	const rows = await db
		.select(ISSUE_COLUMNS)
		.from(billingIssues)
		.leftJoin(users, eq(billingIssues.userId, users.id))
		.leftJoin(subscriptions, eq(billingIssues.subscriptionId, subscriptions.id))
		.where(where)
		.orderBy(desc(billingIssues.createdAt))
		.limit(limit)
		.offset(offset);

	const [totalRow] = await db
		.select({ value: count() })
		.from(billingIssues)
		.leftJoin(users, eq(billingIssues.userId, users.id))
		.leftJoin(subscriptions, eq(billingIssues.subscriptionId, subscriptions.id))
		.where(where);

	const total = totalRow?.value ?? 0;

	return {
		issues: rows as BillingIssueWithContext[],
		total,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit))
	};
}

/** Fetch one billing issue with its subscription / user context. */
export async function getBillingIssueById(id: string): Promise<BillingIssueWithContext | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [row] = await db
		.select(ISSUE_COLUMNS)
		.from(billingIssues)
		.leftJoin(users, eq(billingIssues.userId, users.id))
		.leftJoin(subscriptions, eq(billingIssues.subscriptionId, subscriptions.id))
		.where(and(eq(billingIssues.id, id), eq(billingIssues.tenantId, tenantId)))
		.limit(1);

	return (row as BillingIssueWithContext) ?? null;
}

/** Raw row read used by the service before it mutates an issue. */
export async function getBillingIssueRow(id: string): Promise<BillingIssue | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [row] = await db
		.select()
		.from(billingIssues)
		.where(and(eq(billingIssues.id, id), eq(billingIssues.tenantId, tenantId)))
		.limit(1);

	return row ?? null;
}

/** Create a billing issue. Used by the manual-create route and by detection. */
export async function createBillingIssue(
	data: Omit<NewBillingIssue, 'tenantId'> & { tenantId?: string }
): Promise<BillingIssue> {
	const tenantId = data.tenantId || (await getTenantId());
	if (!tenantId) throw new Error('Tenant ID not found');

	const [row] = await db
		.insert(billingIssues)
		.values({ ...data, tenantId })
		.returning();

	return row;
}

export interface UpdateBillingIssueData {
	status?: BillingIssueStatusValues;
	/** Corrected provider charge reference, when an admin supplied one at refund time. */
	providerPaymentId?: string | null;
	resolutionNote?: string | null;
	resolvedBy?: string | null;
	resolvedAt?: Date | null;
	refundId?: string | null;
	refundAmount?: number | null;
	refundedAt?: Date | null;
}

/** Patch a billing issue in place. Returns null when the row is not in the tenant. */
export async function updateBillingIssue(id: string, data: UpdateBillingIssueData): Promise<BillingIssue | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [row] = await db
		.update(billingIssues)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(billingIssues.id, id), eq(billingIssues.tenantId, tenantId)))
		.returning();

	return row ?? null;
}

/** Counts and totals for the page header tabs and stat cards. */
export async function getBillingIssueStats(): Promise<BillingIssueStats> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const scope = eq(billingIssues.tenantId, tenantId);

	const [byStatusRows, byTypeRows, byProviderRows, atRiskRows] = await Promise.all([
		db
			.select({ status: billingIssues.status, value: count() })
			.from(billingIssues)
			.where(scope)
			.groupBy(billingIssues.status),
		db
			.select({ type: billingIssues.type, value: count() })
			.from(billingIssues)
			.where(scope)
			.groupBy(billingIssues.type),
		db
			.select({ provider: billingIssues.paymentProvider, value: count() })
			.from(billingIssues)
			.where(scope)
			.groupBy(billingIssues.paymentProvider),
		db
			.select({ total: sql<number>`coalesce(sum(${billingIssues.amount}), 0)` })
			.from(billingIssues)
			.where(and(scope, inArray(billingIssues.status, OPEN_BILLING_ISSUE_STATUSES)))
	]);

	const byStatus: Record<string, number> = {};
	for (const row of byStatusRows) byStatus[row.status] = Number(row.value);

	const byType: Record<string, number> = {};
	for (const row of byTypeRows) byType[row.type] = Number(row.value);

	const byProvider: Record<string, number> = {};
	for (const row of byProviderRows) byProvider[row.provider] = Number(row.value);

	const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

	return {
		total,
		openCount: (byStatus[BillingIssueStatus.OPEN] ?? 0) + (byStatus[BillingIssueStatus.IN_REVIEW] ?? 0),
		refundedCount: byStatus[BillingIssueStatus.REFUNDED] ?? 0,
		resolvedCount: byStatus[BillingIssueStatus.RESOLVED] ?? 0,
		byStatus,
		byType,
		byProvider,
		amountAtRisk: Number(atRiskRows[0]?.total ?? 0)
	};
}

/** One problem detected on an existing subscription row. */
interface DetectedIssue {
	subscriptionId: string;
	userId: string;
	type: BillingIssueTypeValues;
	paymentProvider: string;
	providerPaymentId: string | null;
	amount: number;
	currency: string;
	detectionReason: string;
}

export interface SyncBillingIssuesResult {
	created: number;
	skipped: number;
	scanned: number;
}

/**
 * Derive open billing issues from the subscription records the template already
 * stores, so the admin list is populated without inventing a parallel payment
 * store or waiting for a webhook to fire.
 *
 * Two detectors, both reading columns that already exist:
 *   - `failed_payment_count > 0` — a renewal charge the provider could not take.
 *   - a subscription stuck in `pending` or flipped to `expired` while
 *     `auto_renewal` is still on — the "subscription in a bad state" case.
 *
 * Idempotent: rows are keyed by `(tenant_id, source_key)` and inserted with
 * `ON CONFLICT DO NOTHING`, so a re-run never doubles an issue and never
 * re-opens one an admin already closed.
 */
export async function syncBillingIssuesFromSubscriptions(): Promise<SyncBillingIssuesResult> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const candidates = await db
		.select({
			id: subscriptions.id,
			userId: subscriptions.userId,
			status: subscriptions.status,
			planId: subscriptions.planId,
			paymentProvider: subscriptions.paymentProvider,
			invoiceId: subscriptions.invoiceId,
			amount: subscriptions.amount,
			amountDue: subscriptions.amountDue,
			currency: subscriptions.currency,
			failedPaymentCount: subscriptions.failedPaymentCount,
			autoRenewal: subscriptions.autoRenewal
		})
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.tenantId, tenantId),
				or(
					gt(subscriptions.failedPaymentCount, 0),
					eq(subscriptions.status, SubscriptionStatus.PENDING),
					eq(subscriptions.status, SubscriptionStatus.EXPIRED)
				)
			)
		);

	const detected: DetectedIssue[] = [];

	for (const subscription of candidates) {
		const base = {
			subscriptionId: subscription.id,
			userId: subscription.userId,
			paymentProvider: subscription.paymentProvider || PaymentProvider.STRIPE,
			providerPaymentId: subscription.invoiceId,
			amount: subscription.amountDue || subscription.amount || 0,
			currency: subscription.currency || 'usd'
		};

		const failures = subscription.failedPaymentCount ?? 0;
		if (failures > 0) {
			detected.push({
				...base,
				type: BillingIssueType.PAYMENT_FAILED,
				detectionReason: `${failures} failed payment attempt${failures === 1 ? '' : 's'} on subscription ${subscription.id}`
			});
		}

		const stuckPending = subscription.status === SubscriptionStatus.PENDING;
		const expiredWhileRenewing =
			subscription.status === SubscriptionStatus.EXPIRED && subscription.autoRenewal === true;
		if (stuckPending || expiredWhileRenewing) {
			detected.push({
				...base,
				type: BillingIssueType.SUBSCRIPTION_STATE,
				detectionReason: stuckPending
					? `Subscription ${subscription.id} is still pending activation`
					: `Subscription ${subscription.id} expired while auto-renewal was enabled`
			});
		}
	}

	if (detected.length === 0) {
		return { created: 0, skipped: 0, scanned: candidates.length };
	}

	const inserted = await db
		.insert(billingIssues)
		.values(
			detected.map((issue) => ({
				userId: issue.userId,
				subscriptionId: issue.subscriptionId,
				type: issue.type,
				status: BillingIssueStatus.OPEN,
				paymentProvider: issue.paymentProvider,
				providerPaymentId: issue.providerPaymentId,
				amount: issue.amount,
				currency: issue.currency,
				detectionReason: issue.detectionReason,
				sourceKey: buildBillingIssueSourceKey(issue.subscriptionId, issue.type),
				tenantId
			}))
		)
		// The unique index is on (tenant_id, source_key); an issue that already
		// exists — open OR closed — is left exactly as the admin left it.
		.onConflictDoNothing({ target: [billingIssues.tenantId, billingIssues.sourceKey] })
		.returning({ id: billingIssues.id });

	return {
		created: inserted.length,
		skipped: detected.length - inserted.length,
		scanned: candidates.length
	};
}

/**
 * Open (or refresh) an issue for a subscription from a webhook. Used by the
 * payment webhook dispatch when a provider reports a failed charge, so a live
 * failure lands in the admin queue without waiting for the next manual sync.
 *
 * Never re-opens a closed issue: the conflict target is the same
 * `(tenant_id, source_key)` pair detection uses.
 */
export async function upsertBillingIssueForSubscription(input: {
	subscriptionId: string;
	userId: string;
	type: BillingIssueTypeValues;
	paymentProvider: string;
	providerPaymentId?: string | null;
	amount?: number | null;
	currency?: string | null;
	detectionReason: string;
	tenantId: string;
}): Promise<BillingIssue | null> {
	const [row] = await db
		.insert(billingIssues)
		.values({
			userId: input.userId,
			subscriptionId: input.subscriptionId,
			type: input.type,
			status: BillingIssueStatus.OPEN,
			paymentProvider: input.paymentProvider || PaymentProvider.STRIPE,
			providerPaymentId: input.providerPaymentId ?? null,
			amount: input.amount ?? 0,
			currency: input.currency ?? 'usd',
			detectionReason: input.detectionReason,
			sourceKey: buildBillingIssueSourceKey(input.subscriptionId, input.type),
			tenantId: input.tenantId
		})
		.onConflictDoNothing({ target: [billingIssues.tenantId, billingIssues.sourceKey] })
		.returning();

	return row ?? null;
}
