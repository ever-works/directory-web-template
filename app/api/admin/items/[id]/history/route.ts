import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { itemAuditService } from '@/lib/services/item-audit.service';
import { ItemAuditAction, type ItemAuditActionValues } from '@/lib/db/schema';

/**
 * @swagger
 * /api/admin/items/{id}/history:
 *   get:
 *     tags: ["Admin - Items"]
 *     summary: "Get item audit history"
 *     description: "Retrieves the complete audit history for an item including all changes, reviews, and status updates. Supports pagination and filtering by action type. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item ID (slug)"
 *         example: "awesome-productivity-tool"
 *       - name: "page"
 *         in: "query"
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "Page number for pagination"
 *       - name: "limit"
 *         in: "query"
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: "Number of entries per page"
 *       - name: "action"
 *         in: "query"
 *         schema:
 *           type: string
 *         description: "Comma-separated list of action types to filter (created, updated, status_changed, reviewed, deleted, restored)"
 *         example: "created,updated,reviewed"
 *     responses:
 *       200:
 *         description: "History retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           itemId:
 *                             type: string
 *                           itemName:
 *                             type: string
 *                           action:
 *                             type: string
 *                             enum: [created, updated, status_changed, reviewed, deleted, restored]
 *                           previousStatus:
 *                             type: string
 *                             nullable: true
 *                           newStatus:
 *                             type: string
 *                             nullable: true
 *                           changes:
 *                             type: object
 *                             nullable: true
 *                           performedBy:
 *                             type: string
 *                             nullable: true
 *                           performedByName:
 *                             type: string
 *                             nullable: true
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           performer:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                                 nullable: true
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
 *       400:
 *         description: "Bad request - Invalid parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch item history"
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Check admin authentication
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const resolvedParams = await params;
		const itemId = resolvedParams.id;

		// Parse query parameters
		const { searchParams } = new URL(request.url);
		const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
		const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
		const actionParam = searchParams.get('action');

		// Parse action filter
		let actionFilter: ItemAuditActionValues[] | undefined;
		if (actionParam) {
			const validActions = Object.values(ItemAuditAction);
			const actions = actionParam.split(',').map((a) => a.trim());
			const invalidActions = actions.filter((a) => !validActions.includes(a as ItemAuditActionValues));

			if (invalidActions.length > 0) {
				return NextResponse.json(
					{
						success: false,
						error: `Invalid action filter(s): ${invalidActions.join(', ')}. Valid actions are: ${validActions.join(', ')}`
					},
					{ status: 400 }
				);
			}

			actionFilter = actions as ItemAuditActionValues[];
		}

		// Fetch history
		const history = await itemAuditService.getHistory({
			itemId,
			page,
			limit,
			actionFilter
		});

		return NextResponse.json({
			success: true,
			data: history
		});
	} catch (error) {
		console.error('Failed to fetch item history:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch item history'
			},
			{ status: 500 }
		);
	}
}
