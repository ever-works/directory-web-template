import { NextResponse } from 'next/server';
import { checkAdminAuth, requireAdminSession } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import {
	createBillingIssue,
	listBillingIssues,
	syncBillingIssuesFromSubscriptions
} from '@/lib/db/queries/billing-issue.queries';
import {
	BillingIssueStatus,
	BillingIssueType,
	type BillingIssueStatusValues,
	type BillingIssueTypeValues
} from '@/lib/db/schema';
import { PaymentProvider } from '@/lib/constants/payment';

export const runtime = 'nodejs';

const VALID_STATUSES = Object.values(BillingIssueStatus) as string[];
const VALID_TYPES = Object.values(BillingIssueType) as string[];
const VALID_PROVIDERS = Object.values(PaymentProvider) as string[];

/**
 * @swagger
 * /api/admin/billing-issues:
 *   get:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "List billing issues"
 *     description: "Paginated list of billing issues (failed payments, refund requests, disputes, bad subscription states) with the subscription and user context needed to act on them. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: "limit"
 *         in: "query"
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - name: "search"
 *         in: "query"
 *         schema: { type: string }
 *         description: "Matches user email, provider payment id, subscription id, detection reason or resolution note"
 *       - name: "status"
 *         in: "query"
 *         schema: { type: string, enum: ["open", "in_review", "refunded", "resolved", "dismissed"] }
 *       - name: "type"
 *         in: "query"
 *         schema: { type: string, enum: ["payment_failed", "refund_request", "dispute", "subscription_state", "other"] }
 *       - name: "provider"
 *         in: "query"
 *         schema: { type: string, enum: ["stripe", "solidgate", "lemonsqueezy", "polar"] }
 *     responses:
 *       200: { description: "Billing issues retrieved successfully" }
 *       400: { description: "Bad request - invalid filter value" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       500: { description: "Internal server error" }
 */
export async function GET(request: Request) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authError = await checkAdminAuth();
		if (authError) return authError;

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
		const search = (searchParams.get('search') || '').trim();
		const status = searchParams.get('status');
		const type = searchParams.get('type');
		const provider = searchParams.get('provider');

		if (status && !VALID_STATUSES.includes(status)) {
			return NextResponse.json(
				{ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (type && !VALID_TYPES.includes(type)) {
			return NextResponse.json(
				{ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (provider && !VALID_PROVIDERS.includes(provider)) {
			return NextResponse.json(
				{ success: false, error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
				{ status: 400 }
			);
		}

		const result = await listBillingIssues({
			page,
			limit,
			search: search || undefined,
			status: (status as BillingIssueStatusValues) || undefined,
			type: (type as BillingIssueTypeValues) || undefined,
			provider: provider || undefined
		});

		return NextResponse.json({
			success: true,
			data: {
				issues: result.issues,
				pagination: {
					total: result.total,
					page: result.page,
					limit: result.limit,
					totalPages: result.totalPages
				}
			}
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to list billing issues');
	}
}

/**
 * @swagger
 * /api/admin/billing-issues:
 *   post:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Raise a billing issue, or re-scan the payment records for new ones"
 *     description: "With `{ \"action\": \"sync\" }` the endpoint re-scans the stored subscription records for failed payments and bad subscription states and opens an issue for each new one (idempotent). Otherwise it creates a single manual issue. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action: { type: string, enum: ["sync"] }
 *               userId: { type: string }
 *               subscriptionId: { type: string }
 *               type: { type: string, enum: ["payment_failed", "refund_request", "dispute", "subscription_state", "other"] }
 *               paymentProvider: { type: string, enum: ["stripe", "solidgate", "lemonsqueezy", "polar"] }
 *               providerPaymentId: { type: string }
 *               amount: { type: integer, description: "Smallest currency unit" }
 *               currency: { type: string }
 *               detectionReason: { type: string }
 *     responses:
 *       200: { description: "Sync completed" }
 *       201: { description: "Billing issue created" }
 *       400: { description: "Bad request - invalid payload" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       500: { description: "Internal server error" }
 */
export async function POST(request: Request) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;

		let body: Record<string, unknown> = {};
		try {
			body = (await request.json()) as Record<string, unknown>;
		} catch {
			// An empty body means "sync" — the page's refresh button posts nothing.
			body = { action: 'sync' };
		}

		if (body.action === 'sync' || Object.keys(body).length === 0) {
			const result = await syncBillingIssuesFromSubscriptions();
			return NextResponse.json({ success: true, data: result });
		}

		const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
		if (!userId) {
			return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
		}

		const type = typeof body.type === 'string' ? body.type : BillingIssueType.OTHER;
		if (!VALID_TYPES.includes(type)) {
			return NextResponse.json(
				{ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		const paymentProvider =
			typeof body.paymentProvider === 'string' ? body.paymentProvider : PaymentProvider.STRIPE;
		if (!VALID_PROVIDERS.includes(paymentProvider)) {
			return NextResponse.json(
				{ success: false, error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
				{ status: 400 }
			);
		}

		const amount =
			typeof body.amount === 'number' && Number.isInteger(body.amount) && body.amount >= 0 ? body.amount : 0;

		const issue = await createBillingIssue({
			userId,
			subscriptionId: typeof body.subscriptionId === 'string' && body.subscriptionId ? body.subscriptionId : null,
			type: type as BillingIssueTypeValues,
			status: BillingIssueStatus.OPEN,
			paymentProvider,
			providerPaymentId:
				typeof body.providerPaymentId === 'string' && body.providerPaymentId ? body.providerPaymentId : null,
			amount,
			currency: typeof body.currency === 'string' && body.currency ? body.currency : 'usd',
			detectionReason:
				typeof body.detectionReason === 'string' && body.detectionReason.trim()
					? body.detectionReason.trim()
					: 'Raised manually by an admin'
		});

		return NextResponse.json({ success: true, data: issue }, { status: 201 });
	} catch (error) {
		return safeErrorResponse(error, 'Failed to create billing issue');
	}
}
