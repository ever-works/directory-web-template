import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getReports } from '@/lib/db/queries';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import {
	ReportStatus,
	ReportContentType,
	ReportReason,
	type ReportStatusValues,
	type ReportContentTypeValues,
	type ReportReasonValues
} from '@/lib/db/schema';

export const runtime = 'nodejs';

// Valid values for validation
const VALID_STATUSES = Object.values(ReportStatus);
const VALID_CONTENT_TYPES = Object.values(ReportContentType);
const VALID_REASONS = Object.values(ReportReason);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     tags: ["Admin - Reports"]
 *     summary: "Get paginated reports list"
 *     description: "Returns a paginated list of content reports with reporter information. Supports filtering by status, content type, and reason. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: "limit"
 *         in: "query"
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: "search"
 *         in: "query"
 *         schema:
 *           type: string
 *         description: "Search term for content ID, details, or reporter name/email"
 *       - name: "status"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["pending", "reviewed", "resolved", "dismissed"]
 *       - name: "contentType"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["item", "comment"]
 *       - name: "reason"
 *         in: "query"
 *         schema:
 *           type: string
 *           enum: ["spam", "harassment", "inappropriate", "other"]
 *     responses:
 *       200:
 *         description: "Reports list retrieved successfully"
 *       403:
 *         description: "Forbidden - Admin access required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: Request) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
		const search = (searchParams.get('search') || '').trim();
		const status = searchParams.get('status') as ReportStatusValues | null;
		const contentType = searchParams.get('contentType') as ReportContentTypeValues | null;
		const reason = searchParams.get('reason') as ReportReasonValues | null;

		// Validate filter values if provided
		if (status && !VALID_STATUSES.includes(status)) {
			return NextResponse.json(
				{ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
			return NextResponse.json(
				{ success: false, error: `Invalid contentType. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (reason && !VALID_REASONS.includes(reason)) {
			return NextResponse.json(
				{ success: false, error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
				{ status: 400 }
			);
		}

		const result = await getReports({
			page,
			limit,
			search: search || undefined,
			status: status || undefined,
			contentType: contentType || undefined,
			reason: reason || undefined
		});

		return NextResponse.json({
			success: true,
			data: {
				reports: result.reports,
				pagination: {
					total: result.total,
					page: result.page,
					limit: result.limit,
					totalPages: result.totalPages
				}
			}
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to list reports:', error);
		}
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}
