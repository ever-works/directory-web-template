import { NextResponse } from 'next/server';
import { getReportById, updateReport } from '@/lib/db/queries';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { checkAdminAuth, requireAdminSession } from '@/lib/auth/admin-guard';
import { emitActivityEvent } from '@/lib/services/platform-activity-feed/push-client';
import { ReportStatus, ReportResolution, type ReportStatusValues, type ReportResolutionValues } from '@/lib/db/schema';
import { removeContent, warnUser, suspendUser, banUser, getContentOwner } from '@/lib/services/moderation.service';
import { getModerationActionsByReport } from '@/lib/db/queries/moderation.queries';
import { runReportModeration } from '@/lib/services/report-moderation';

export const runtime = 'nodejs';

// Valid values for validation
const VALID_STATUSES = Object.values(ReportStatus);
const VALID_RESOLUTIONS = Object.values(ReportResolution);

const isReportStatus = (value: unknown): value is ReportStatusValues =>
	typeof value === 'string' && (VALID_STATUSES as string[]).includes(value);
const isReportResolution = (value: unknown): value is ReportResolutionValues =>
	typeof value === 'string' && (VALID_RESOLUTIONS as string[]).includes(value);

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
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authError = await checkAdminAuth();
		if (authError) return authError;

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
 *     description: "Updates a report's status, resolution, and/or review note. Requires admin privileges. A resolution other than no_action runs its moderation action first (remove the content, or warn / suspend / ban its owner's client profile); if that action fails, the report is left unchanged and the response is an error. A resolution the report already has is not run again, so the note and status of a completed report can still be edited. Retrying a resolution whose action ran but whose report save failed saves the report without acting twice: a warning or content removal this report already recorded in the moderation history is skipped, and a ban or suspension this report already applied (ALREADY_BANNED / ALREADY_SUSPENDED with a history row for this report) counts as done."
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
 *         description: "Bad request - Invalid input (a body that is not a JSON object, a status or resolution that is present but not one of the listed values, null included, or a review note that is not a string; checked before any moderation action runs), or the content owner could not be identified for warn / suspend / ban (for example 'Item submitter has no client profile', or 'Item not found' when the content is gone); the report is unchanged"
 *       403:
 *         description: "Forbidden - Admin access required"
 *       404:
 *         description: "Report not found"
 *       409:
 *         description: "The moderation action does not fit the target's current state (for example 'User is already banned' by another report or by hand, the user to warn, suspend or ban no longer exists, or content_removed on content that cannot be found); the report is unchanged"
 *       500:
 *         description: "Internal server error, or the moderation action failed (for example 'Failed to warn user'); the report is unchanged"
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;
		const { session } = authResult;

		const { id } = await params;

		// Check if report exists
		const existingReport = await getReportById(id);
		if (!existingReport) {
			return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
		}

		// Parse and validate the whole body before any moderation action runs: a field the report
		// save would reject (for example `status: null` on the NOT NULL column) must fail here,
		// not after the user was already warned, suspended or banned or the content removed.
		const body: unknown = await request.json().catch(() => null);
		if (!body || typeof body !== 'object' || Array.isArray(body)) {
			return NextResponse.json({ success: false, error: 'Request body must be a JSON object' }, { status: 400 });
		}
		const { status, resolution, reviewNote } = body as Record<string, unknown>;

		// A field that is present must be valid; null or '' is not a status or a resolution
		if (status !== undefined && !isReportStatus(status)) {
			return NextResponse.json(
				{ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
				{ status: 400 }
			);
		}

		if (resolution !== undefined && !isReportResolution(resolution)) {
			return NextResponse.json(
				{ success: false, error: `Invalid resolution. Must be one of: ${VALID_RESOLUTIONS.join(', ')}` },
				{ status: 400 }
			);
		}

		if (reviewNote !== undefined && typeof reviewNote !== 'string') {
			return NextResponse.json({ success: false, error: 'Review note must be a string' }, { status: 400 });
		}

		// Run the moderation action before the report is saved, so a failed action leaves the
		// report as it was and the admin sees the failure. A resolution equal to the saved one runs
		// nothing (the review dialog sends it back with every edit), and a retry after a failed save
		// finishes the save instead of acting twice (lib/services/report-moderation.ts).
		const moderation = await runReportModeration(
			{
				reportId: id,
				contentType: existingReport.contentType,
				contentId: existingReport.contentId,
				resolution: resolution as ReportResolutionValues | undefined,
				savedResolution: existingReport.resolution,
				reviewNote,
				adminId: session.user.id! // Non-null assertion - validated by requireAdminSession above
			},
			{
				reportActions: getModerationActionsByReport,
				removeContent,
				getContentOwner,
				warnUser,
				suspendUser,
				banUser
			}
		);
		if (!moderation.ok) {
			return NextResponse.json({ success: false, error: moderation.error }, { status: moderation.status });
		}
		const moderationResult = moderation.result;

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

		// EW-120 push mode: emit WEBSITE_REPORT_RESOLVED on any terminal
		// status transition. Fire-and-forget; never block the admin response.
		const becameTerminal =
			(status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED) && existingReport.status !== status;
		if (becameTerminal) {
			void emitActivityEvent({
				actionType: 'WEBSITE_REPORT_RESOLVED',
				summary: `Report resolved (${status}${resolution ? `, ${resolution}` : ''})`,
				metadata: {
					reportId: id,
					previousStatus: existingReport.status,
					newStatus: status,
					resolution: resolution ?? null,
					reviewedBy: session.user.id
				}
			});
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
