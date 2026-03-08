import { NextResponse } from 'next/server';
import { requireClientAuth, serverErrorResponse } from '@/lib/utils/client-auth';
import { getClientDashboardRepository } from '@/lib/repositories/client-dashboard.repository';

/**
 * @swagger
 * /api/client/dashboard/stats:
 *   get:
 *     tags: ["Client - Dashboard"]
 *     summary: "Get user dashboard statistics"
 *     description: "Returns comprehensive dashboard statistics for the authenticated user including submission counts, engagement metrics, charts data, and top performing items."
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
 *                 totalSubmissions:
 *                   type: integer
 *                   description: "Total number of items submitted by user"
 *                   example: 23
 *                 totalViews:
 *                   type: integer
 *                   description: "Total views on user's items (0 if not tracked)"
 *                   example: 0
 *                 totalVotesReceived:
 *                   type: integer
 *                   description: "Total votes received on user's items"
 *                   example: 156
 *                 totalCommentsReceived:
 *                   type: integer
 *                   description: "Total comments received on user's items"
 *                   example: 89
 *                 viewsAvailable:
 *                   type: boolean
 *                   description: "Whether views tracking is available"
 *                   example: false
 *                 recentActivity:
 *                   type: object
 *                   properties:
 *                     newSubmissions:
 *                       type: integer
 *                       example: 3
 *                     newViews:
 *                       type: integer
 *                       example: 0
 *                 uniqueItemsInteracted:
 *                   type: integer
 *                   description: "Number of unique items user has interacted with"
 *                   example: 45
 *                 totalActivity:
 *                   type: integer
 *                   description: "Total activity count (votes + comments made)"
 *                   example: 237
 *                 activityChartData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "Mon"
 *                       submissions:
 *                         type: integer
 *                       views:
 *                         type: integer
 *                       engagement:
 *                         type: integer
 *                 engagementChartData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       value:
 *                         type: integer
 *                       color:
 *                         type: string
 *                 submissionTimeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         example: "Mar"
 *                       submissions:
 *                         type: integer
 *                 engagementOverview:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       week:
 *                         type: string
 *                         example: "W1"
 *                       votes:
 *                         type: integer
 *                       comments:
 *                         type: integer
 *                 statusBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         enum: ["Approved", "Pending", "Rejected"]
 *                       value:
 *                         type: integer
 *                       color:
 *                         type: string
 *                 topItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       views:
 *                         type: integer
 *                       votes:
 *                         type: integer
 *                       comments:
 *                         type: integer
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
 *                   example: "Failed to fetch dashboard statistics"
 */
export async function GET() {
    try {
        // Check client authentication
        const authResult = await requireClientAuth();
        if (!authResult.success) {
            return authResult.response;
        }
        const { userId } = authResult;

        // Get dashboard repository and fetch stats
        const dashboardRepository = getClientDashboardRepository();
        const stats = await dashboardRepository.getStats(userId);

        return NextResponse.json({
            success: true,
            ...stats,
        });
    } catch (error) {
        return serverErrorResponse(error, 'Failed to fetch dashboard statistics');
    }
}
