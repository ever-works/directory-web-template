import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { listPaymentRecords, summarizePayments } from '@/lib/db/queries/payment-report.queries';
import { parsePaymentReportFilters } from '@/lib/services/payment-report-filters';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/payment-reports:
 *   get:
 *     tags: ["Admin - Payment Reports"]
 *     summary: "Payment report rows plus revenue roll-ups"
 *     description: "Paginated payment records from the subscription/payment data the site already stores, filtered by date range, plan, provider and status, together with totals by currency, plan, provider and status for the same filter set. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: "limit"
 *         in: "query"
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 20 }
 *       - name: "from"
 *         in: "query"
 *         schema: { type: string, format: date }
 *         description: "Inclusive lower bound on the record date"
 *       - name: "to"
 *         in: "query"
 *         schema: { type: string, format: date }
 *         description: "Inclusive upper bound on the record date; a bare date covers the whole day"
 *       - name: "planId"
 *         in: "query"
 *         schema: { type: string }
 *       - name: "status"
 *         in: "query"
 *         schema: { type: string, enum: ["active", "cancelled", "expired", "pending", "paused"] }
 *       - name: "provider"
 *         in: "query"
 *         schema: { type: string, enum: ["stripe", "solidgate", "lemonsqueezy", "polar"] }
 *       - name: "search"
 *         in: "query"
 *         schema: { type: string }
 *     responses:
 *       200: { description: "Report retrieved successfully" }
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
		const parsed = parsePaymentReportFilters(searchParams);
		if ('error' in parsed) {
			return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
		}

		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 20));

		const [list, summary] = await Promise.all([
			listPaymentRecords({ ...parsed.filters, page, limit }),
			summarizePayments(parsed.filters)
		]);

		return NextResponse.json({
			success: true,
			data: {
				records: list.records,
				summary,
				pagination: {
					total: list.total,
					page: list.page,
					limit: list.limit,
					totalPages: list.totalPages
				}
			}
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to build the payment report');
	}
}
