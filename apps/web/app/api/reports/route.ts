import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createReport, getClientProfileById, hasUserReportedContent } from '@/lib/db/queries';
import { isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries/moderation.queries';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import {
	ReportContentType,
	ReportReason,
	type ReportContentTypeValues,
	type ReportReasonValues
} from '@/lib/db/schema';

export const runtime = 'nodejs';

// Valid content types and reasons for validation
const VALID_CONTENT_TYPES = Object.values(ReportContentType);
const VALID_REASONS = Object.values(ReportReason);

/**
 * @swagger
 * /api/reports:
 *   post:
 *     tags: ["Reports"]
 *     summary: "Submit a content report"
 *     description: "Submit a report for inappropriate content (items or comments). Requires authentication. Users can only report the same content once."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: ["item", "comment"]
 *                 description: "Type of content being reported"
 *                 example: "item"
 *               contentId:
 *                 type: string
 *                 description: "ID or slug of the content being reported"
 *                 example: "awesome-productivity-tool"
 *               reason:
 *                 type: string
 *                 enum: ["spam", "harassment", "inappropriate", "other"]
 *                 description: "Reason for the report"
 *                 example: "spam"
 *               details:
 *                 type: string
 *                 description: "Additional details about the report (optional)"
 *                 example: "This tool is promoting malicious software"
 *             required: ["contentType", "contentId", "reason"]
 *     responses:
 *       200:
 *         description: "Report submitted successfully"
 *       400:
 *         description: "Bad request - Invalid input data"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *       409:
 *         description: "Conflict - Content already reported by this user"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: Request) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		// Require authentication
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
		}

		// Check if user has a client profile (required to submit reports)
		if (!session.user.clientProfileId) {
			return NextResponse.json(
				{ success: false, error: 'Client profile required to submit reports' },
				{ status: 403 }
			);
		}

		// Get client profile using clientProfileId
		const clientProfile = await getClientProfileById(session.user.clientProfileId);
		if (!clientProfile) {
			return NextResponse.json({ success: false, error: 'Client profile not found' }, { status: 404 });
		}

		// Check if user is blocked (suspended or banned)
		if (isUserBlocked(clientProfile.status)) {
			return NextResponse.json(
				{ success: false, error: getBlockReasonMessage(clientProfile.status) },
				{ status: 403 }
			);
		}

		// Parse and validate request body
		const body = await request.json();
		const { contentType, contentId, reason, details } = body;

		// Validate contentType
		if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
			return NextResponse.json(
				{ success: false, error: `Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}` },
				{ status: 400 }
			);
		}

		// Validate contentId
		if (!contentId || typeof contentId !== 'string' || !contentId.trim()) {
			return NextResponse.json({ success: false, error: 'Content ID is required' }, { status: 400 });
		}

		// Validate reason
		if (!reason || !VALID_REASONS.includes(reason)) {
			return NextResponse.json(
				{ success: false, error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
				{ status: 400 }
			);
		}

		// Check if user has already reported this content
		const alreadyReported = await hasUserReportedContent(
			clientProfile.id,
			contentType as ReportContentTypeValues,
			contentId.trim()
		);

		if (alreadyReported) {
			return NextResponse.json(
				{ success: false, error: 'You have already reported this content' },
				{ status: 409 }
			);
		}

		// Create the report
		const report = await createReport({
			contentType: contentType as ReportContentTypeValues,
			contentId: contentId.trim(),
			reason: reason as ReportReasonValues,
			details: typeof details === 'string' ? details.trim() || undefined : undefined,
			reportedBy: clientProfile.id
		});

		return NextResponse.json({
			success: true,
			message: 'Report submitted successfully',
			report: {
				id: report.id,
				contentType: report.contentType,
				contentId: report.contentId,
				reason: report.reason,
				status: report.status,
				createdAt: report.createdAt
			}
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to submit report:', error);
		}
		return NextResponse.json({ success: false, error: 'Failed to submit report' }, { status: 500 });
	}
}
