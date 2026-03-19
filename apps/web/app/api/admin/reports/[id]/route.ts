import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getReportById, updateReport } from '@/lib/db/queries';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import {
	ReportStatus,
	ReportResolution,
	type ReportStatusValues,
	type ReportResolutionValues
} from '@/lib/db/schema';
import {
	removeContent,
	warnUser,
	suspendUser,
	banUser,
	getContentOwner
} from '@/lib/services/moderation.service';

export const runtime = 'nodejs';

// Valid values for validation
const VALID_STATUSES = Object.values(ReportStatus);
const VALID_RESOLUTIONS = Object.values(ReportResolution);

/**
 * @swagger
 * /api/admin/reports/{id}:
 *   get:
 *     tags: ["Admin - Reports"]
 *     summary: "Get report by ID"
 *     description: "Retrieves a specific report by ID with reporter and reviewer information. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Report ID"
 *     responses:
 *       200:
 *         description: "Report retrieved successfully"
 *       403:
 *         description: "Forbidden - Admin access required"
 *       404:
 *         description: "Report not found"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;
		const report = await getReportById(id);

		if (!report) {
			return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: report
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to get report:', error);
		}
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/reports/{id}:
 *   put:
 *     tags: ["Admin - Reports"]
 *     summary: "Update report status and resolution"
 *     description: "Updates a report's status, resolution, and/or review note. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Report ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["pending", "reviewed", "resolved", "dismissed"]
 *               resolution:
 *                 type: string
 *                 enum: ["content_removed", "user_warned", "user_suspended", "user_banned", "no_action"]
 *               reviewNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Report updated successfully"
 *       400:
 *         description: "Bad request - Invalid input"
 *       403:
 *         description: "Forbidden - Admin access required"
 *       404:
 *         description: "Report not found"
 *       500:
 *         description: "Internal server error"
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;

		// Check if report exists
		const existingReport = await getReportById(id);
		if (!existingReport) {
			return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
		}

		// Parse request body
		const body = await request.json();
		const { status, resolution, reviewNote } = body;

		// Validate status if provided
		if (status && !VALID_STATUSES.includes(status)) {
			return NextResponse.json(
				{ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
				{ status: 400 }
			);
		}

		// Validate resolution if provided
		if (resolution && !VALID_RESOLUTIONS.includes(resolution)) {
			return NextResponse.json(
				{ success: false, error: `Invalid resolution. Must be one of: ${VALID_RESOLUTIONS.join(', ')}` },
				{ status: 400 }
			);
		}

		// Update the report
		const updatedReport = await updateReport(id, {
			status: status as ReportStatusValues | undefined,
			resolution: resolution as ReportResolutionValues | undefined,
			reviewNote: typeof reviewNote === 'string' ? reviewNote.trim() || undefined : undefined,
			reviewedBy: session.user.id
		});

		if (!updatedReport) {
			return NextResponse.json({ success: false, error: 'Failed to update report' }, { status: 500 });
		}

		// Execute moderation action based on resolution
		let moderationResult = null;
		if (resolution && resolution !== ReportResolution.NO_ACTION) {
			const adminId = session.user.id!; // Non-null assertion - validated by isAdmin check above

			if (resolution === ReportResolution.CONTENT_REMOVED) {
				// Remove the reported content
				moderationResult = await removeContent(
					existingReport.contentType,
					existingReport.contentId,
					id,
					adminId
				);
			} else {
				// For user actions (warn, suspend, ban), first get the content owner
				const ownerResult = await getContentOwner(existingReport.contentType, existingReport.contentId);

				if (!ownerResult.success || !ownerResult.userId) {
					return NextResponse.json(
						{
							success: false,
							error: ownerResult.error || 'Could not identify content owner for moderation action'
						},
						{ status: 400 }
					);
				}

				const reason = typeof reviewNote === 'string' ? reviewNote.trim() : 'Report violation';

				switch (resolution) {
					case ReportResolution.USER_WARNED:
						moderationResult = await warnUser(ownerResult.userId, reason, id, adminId);
						break;
					case ReportResolution.USER_SUSPENDED:
						moderationResult = await suspendUser(ownerResult.userId, reason, id, adminId);
						break;
					case ReportResolution.USER_BANNED:
						moderationResult = await banUser(ownerResult.userId, reason, id, adminId);
						break;
				}
			}

			// Check if moderation action failed
			if (moderationResult && !moderationResult.success) {
				// Log the error but don't fail the request since report was updated
				console.error('Moderation action failed:', moderationResult.error);
			}
		}

		// Fetch updated report with full details
		const reportWithDetails = await getReportById(id);

		return NextResponse.json({
			success: true,
			message: moderationResult?.message || 'Report updated successfully',
			data: reportWithDetails,
			moderationResult
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to update report:', error);
		}
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}
