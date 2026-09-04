import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { BillingIssueActionError, refundBillingIssue } from '@/lib/services/billing-issue.service';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/billing-issues/{id}/refund:
 *   post:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Refund the payment behind a billing issue"
 *     description: "Issues a refund through the payment provider named on the underlying subscription record (Stripe, Polar or Solidgate today; LemonSqueezy answers 409 because its refunds are dashboard-only), then records the refund id and amount on the issue, marks it refunded, and appends an entry to the subscription history. The issue is only marked refunded after the provider call succeeds, so a failed call can be retried. Omit `amount` for a full refund. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: "Partial refund amount in the smallest currency unit. Omit for a full refund."
 *               providerPaymentId:
 *                 type: string
 *                 description: "Provider charge / payment reference to refund. Overrides the reference stored on the issue and is persisted when the refund succeeds — detection can only fill it from the invoice id the site stores, so an admin holding the real charge id can supply it here."
 *               note: { type: string }
 *     responses:
 *       200: { description: "Refund issued and the billing issue marked refunded" }
 *       400: { description: "Bad request - invalid amount" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       404: { description: "Billing issue not found" }
 *       409: { description: "Conflict - already refunded, no payment reference, or a dashboard-only provider" }
 *       502: { description: "The payment provider rejected the refund" }
 *       500: { description: "Internal server error" }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;
		const { session } = authResult;

		const { id } = await params;

		let body: Record<string, unknown> = {};
		try {
			body = (await request.json()) as Record<string, unknown>;
		} catch {
			// No body means a full refund.
			body = {};
		}

		let amount: number | undefined;
		if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
			const parsed = typeof body.amount === 'number' ? body.amount : Number(body.amount);
			if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
				return NextResponse.json(
					{ success: false, error: 'Refund amount must be a positive integer in the smallest currency unit' },
					{ status: 400 }
				);
			}
			amount = parsed;
		}

		const note = typeof body.note === 'string' ? body.note.trim() : undefined;
		const providerPaymentId =
			typeof body.providerPaymentId === 'string' ? body.providerPaymentId.trim() : undefined;

		const issue = await refundBillingIssue({
			issueId: id,
			amount,
			providerPaymentId: providerPaymentId || undefined,
			adminId: session.user.id,
			note: note || undefined
		});

		return NextResponse.json({ success: true, data: issue });
	} catch (error) {
		if (error instanceof BillingIssueActionError) {
			return NextResponse.json({ success: false, error: error.message }, { status: error.status });
		}
		return safeErrorResponse(error, 'Failed to issue the refund');
	}
}
