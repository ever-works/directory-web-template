import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';

/**
 * @swagger
 * /api/sponsor-ads/user/stats:
 *   get:
 *     tags: ["Sponsor Ads - User"]
 *     summary: "Get user's sponsor ad statistics"
 *     description: "Returns statistics for the authenticated user's sponsor ads including counts by status, interval distribution, and revenue metrics."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "User's sponsor ad statistics retrieved successfully"
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
 *                     overview:
 *                       type: object
 *                       description: "Breakdown of sponsor ads by status"
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: "Total number of sponsor ads"
 *                           example: 15
 *                         pendingPayment:
 *                           type: integer
 *                           description: "Ads awaiting payment"
 *                           example: 2
 *                         pending:
 *                           type: integer
 *                           description: "Ads pending review"
 *                           example: 3
 *                         active:
 *                           type: integer
 *                           description: "Currently active ads"
 *                           example: 5
 *                         rejected:
 *                           type: integer
 *                           description: "Rejected ads"
 *                           example: 1
 *                         expired:
 *                           type: integer
 *                           description: "Expired ads"
 *                           example: 3
 *                         cancelled:
 *                           type: integer
 *                           description: "Cancelled ads"
 *                           example: 1
 *                       required: ["total", "pendingPayment", "pending", "active", "rejected", "expired", "cancelled"]
 *                     byInterval:
 *                       type: object
 *                       description: "Distribution by billing interval"
 *                       properties:
 *                         weekly:
 *                           type: integer
 *                           description: "Number of weekly ads"
 *                           example: 8
 *                         monthly:
 *                           type: integer
 *                           description: "Number of monthly ads"
 *                           example: 7
 *                       required: ["weekly", "monthly"]
 *                     revenue:
 *                       type: object
 *                       description: "Revenue metrics (in minor currency units, e.g., cents)"
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                           description: "Total revenue from all ads"
 *                           example: 45000
 *                         weeklyRevenue:
 *                           type: number
 *                           description: "Revenue from weekly ads"
 *                           example: 20000
 *                         monthlyRevenue:
 *                           type: number
 *                           description: "Revenue from monthly ads"
 *                           example: 25000
 *                       required: ["totalRevenue", "weeklyRevenue", "monthlyRevenue"]
 *                   required: ["overview", "byInterval", "revenue"]
 *               required: ["success", "stats"]
 *             examples:
 *               typical_user:
 *                 summary: "User with multiple sponsor ads"
 *                 value:
 *                   success: true
 *                   stats:
 *                     overview:
 *                       total: 15
 *                       pendingPayment: 2
 *                       pending: 3
 *                       active: 5
 *                       rejected: 1
 *                       expired: 3
 *                       cancelled: 1
 *                     byInterval:
 *                       weekly: 8
 *                       monthly: 7
 *                     revenue:
 *                       totalRevenue: 45000
 *                       weeklyRevenue: 20000
 *                       monthlyRevenue: 25000
 *               new_user:
 *                 summary: "New user with no sponsor ads"
 *                 value:
 *                   success: true
 *                   stats:
 *                     overview:
 *                       total: 0
 *                       pendingPayment: 0
 *                       pending: 0
 *                       active: 0
 *                       rejected: 0
 *                       expired: 0
 *                       cancelled: 0
 *                     byInterval:
 *                       weekly: 0
 *                       monthly: 0
 *                     revenue:
 *                       totalRevenue: 0
 *                       weeklyRevenue: 0
 *                       monthlyRevenue: 0
 *       401:
 *         description: "Unauthorized - User not authenticated"
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
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error - Failed to fetch statistics"
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
 *                   example: "Failed to fetch sponsor ad stats"
 */
export async function GET() {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const stats = await sponsorAdService.getSponsorAdStatsByUser(session.user.id);

		return NextResponse.json({
			success: true,
			stats,
		});
	} catch (error) {
		console.error('Error fetching user sponsor ad stats:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch sponsor ad stats' }, { status: 500 });
	}
}
