import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { EmailNotificationService } from '@/lib/services/email-notification.service';

const itemRepository = new ItemRepository();
const userRepository = new UserRepository();

export interface BulkActionRequest {
	action: 'approve' | 'reject' | 'delete';
	ids: string[];
	reason?: string;
}

export interface BulkActionResult {
	id: string;
	success: boolean;
	error?: string;
}

export interface BulkActionResponse {
	success: boolean;
	message: string;
	results: BulkActionResult[];
	summary: {
		total: number;
		successful: number;
		failed: number;
	};
}

/**
 * @swagger
 * /api/admin/items/bulk:
 *   post:
 *     tags: ["Admin - Items"]
 *     summary: "Bulk action on items"
 *     description: "Performs bulk actions (approve, reject, delete) on multiple items. Processes each item individually and returns detailed results including successes and failures. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: ["approve", "reject", "delete"]
 *                 description: "The action to perform on selected items"
 *                 example: "approve"
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Array of item IDs to process"
 *                 minItems: 1
 *                 maxItems: 100
 *                 example: ["item_123", "item_456", "item_789"]
 *               reason:
 *                 type: string
 *                 description: "Rejection reason (required when action is 'reject', minimum 10 characters)"
 *                 example: "Does not meet quality standards"
 *             required: ["action", "ids"]
 *     responses:
 *       200:
 *         description: "Bulk action completed (may include partial failures)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Bulk approve completed: 3 successful, 0 failed"
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "item_123"
 *                       success:
 *                         type: boolean
 *                         example: true
 *                       error:
 *                         type: string
 *                         description: "Error message if failed"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     successful:
 *                       type: integer
 *                       example: 3
 *                     failed:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: "Bad request - Invalid input"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest): Promise<NextResponse<BulkActionResponse | { success: false; error: string }>> {
	try {
		// Check admin authentication
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const body: BulkActionRequest = await request.json();
		const { action, ids, reason } = body;

		// Validate action
		if (!action || !['approve', 'reject', 'delete'].includes(action)) {
			return NextResponse.json(
				{ success: false, error: "Action must be 'approve', 'reject', or 'delete'" },
				{ status: 400 }
			);
		}

		// Validate ids array
		if (!Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'At least one item ID is required' },
				{ status: 400 }
			);
		}

		// Limit to 100 items per request
		if (ids.length > 100) {
			return NextResponse.json(
				{ success: false, error: 'Maximum 100 items per bulk action' },
				{ status: 400 }
			);
		}

		// Validate individual IDs and check for duplicates
		const uniqueIds = new Set<string>();
		for (const id of ids) {
			if (!id || typeof id !== 'string' || id.trim().length === 0) {
				return NextResponse.json(
					{ success: false, error: 'All item IDs must be non-empty strings' },
					{ status: 400 }
				);
			}
			if (uniqueIds.has(id)) {
				return NextResponse.json(
					{ success: false, error: 'Duplicate item IDs are not allowed' },
					{ status: 400 }
				);
			}
			uniqueIds.add(id);
		}

		// Validate reason for reject action
		if (action === 'reject') {
			if (!reason || reason.trim().length < 10) {
				return NextResponse.json(
					{ success: false, error: 'Rejection reason is required (minimum 10 characters)' },
					{ status: 400 }
				);
			}
		}

		// Trim reason after validation to ensure clean data storage
		const trimmedReason = reason?.trim();

		const results: BulkActionResult[] = [];

		// Process each item
		for (const id of ids) {
			try {
				if (action === 'approve') {
					const item = await itemRepository.review(id, {
						status: 'approved',
					});

					// Send notification email (fire-and-forget with error logging)
					sendReviewNotification(item, 'approved').catch(err =>
						console.error('[Bulk] Failed to send approval notification for item %s:', id, err)
					);

					results.push({ id, success: true });
				} else if (action === 'reject') {
					const item = await itemRepository.review(id, {
						status: 'rejected',
						review_notes: trimmedReason,
					});

					// Send notification email (fire-and-forget with error logging)
					sendReviewNotification(item, 'rejected', trimmedReason).catch(err =>
						console.error('[Bulk] Failed to send rejection notification for item %s:', id, err)
					);

					results.push({ id, success: true });
				} else if (action === 'delete') {
					await itemRepository.delete(id);
					results.push({ id, success: true });
				}
			} catch (error) {
				results.push({
					id,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		const successful = results.filter(r => r.success).length;
		const failed = results.filter(r => !r.success).length;

		const actionPastTense = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'deleted';

		return NextResponse.json({
			success: true,
			message: `Bulk ${action} completed: ${successful} ${actionPastTense}, ${failed} failed`,
			results,
			summary: {
				total: ids.length,
				successful,
				failed,
			},
		});
	} catch (error) {
		console.error('Error in bulk item action:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to process bulk action' },
			{ status: 500 }
		);
	}
}

// Helper function to send review notification emails (non-blocking)
async function sendReviewNotification(
	item: { id: string; name: string; submitted_by?: string },
	status: 'approved' | 'rejected',
	reason?: string
): Promise<void> {
	try {
		if (item.submitted_by && item.submitted_by !== 'admin' && item.submitted_by !== 'anonymous') {
			const user = await userRepository.findById(item.submitted_by);
			if (user?.email) {
				await EmailNotificationService.sendSubmissionDecisionEmail(
					user.email,
					item.name,
					status,
					reason
				);
			}
		}
	} catch (error) {
		console.error(`[Bulk] Failed to send notification for item ${item.id}:`, error);
		// Don't throw - notifications should not block the operation
	}
}
