import { NextResponse } from 'next/server';
import { requireClientAuth, serverErrorResponse } from '@/lib/utils/client-auth';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';

/**
 * @swagger
 * /api/client/items/stats:
 *   get:
 *     tags: ["Client - Items"]
 *     summary: "Get user's submission statistics"
 *     description: "Returns statistics about the authenticated user's submissions including counts by status."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Statistics retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: "Total number of active (non-deleted) submissions"
 *                       example: 12
 *                     draft:
 *                       type: integer
 *                       description: "Number of draft submissions"
 *                       example: 2
 *                     pending:
 *                       type: integer
 *                       description: "Number of submissions pending review"
 *                       example: 3
 *                     approved:
 *                       type: integer
 *                       description: "Number of approved submissions"
 *                       example: 5
 *                     rejected:
 *                       type: integer
 *                       description: "Number of rejected submissions"
 *                       example: 2
 *                     deleted:
 *                       type: integer
 *                       description: "Number of soft-deleted submissions"
 *                       example: 1
 *       401:
 *         description: "Unauthorized - Authentication required"
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
 *                   example: "Unauthorized. Please sign in to continue."
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
 *                   example: "Failed to fetch statistics"
 */
export async function GET() {
  try {
    // Check client authentication
    const authResult = await requireClientAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Get client item repository
    const clientItemRepository = getClientItemRepository();

    // Fetch stats for user
    const stats = await clientItemRepository.getStatsByUser(userId);

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    return serverErrorResponse(error, 'Failed to fetch statistics');
  }
}
