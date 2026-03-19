import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getReportStats } from '@/lib/db/queries';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/reports/stats:
 *   get:
 *     tags: ["Admin - Reports"]
 *     summary: "Get report statistics"
 *     description: "Returns statistics about reports including counts by status, content type, and reason. Requires admin privileges."
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pendingCount:
 *                       type: integer
 *                     resolvedCount:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                     byContentType:
 *                       type: object
 *                     byReason:
 *                       type: object
 *       403:
 *         description: "Forbidden - Admin access required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET() {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const stats = await getReportStats();

		return NextResponse.json({
			success: true,
			data: stats
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to get report stats:', error);
		}
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}
