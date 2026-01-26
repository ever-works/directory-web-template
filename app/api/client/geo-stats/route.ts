import { NextResponse } from 'next/server';
import { requireClientAuth, serverErrorResponse } from '@/lib/utils/client-auth';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';

/**
 * @swagger
 * /api/client/geo-stats:
 *   get:
 *     tags: ["Client - Dashboard"]
 *     summary: "Get geographic statistics for the client's items"
 *     description: "Returns geographic coverage statistics including items with location, remote items, service area breakdown, top cities, and top countries for the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Geographic statistics retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total_items:
 *                   type: integer
 *                   example: 10
 *                 items_with_location:
 *                   type: integer
 *                   example: 7
 *                 items_remote:
 *                   type: integer
 *                   example: 2
 *                 service_area_breakdown:
 *                   type: array
 *                   description: "Top service areas by count (sorted descending)"
 *                   items:
 *                     type: object
 *                     properties:
 *                       area:
 *                         type: string
 *                         example: "local"
 *                       count:
 *                         type: integer
 *                         example: 3
 *                 top_cities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 top_countries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       country:
 *                         type: string
 *                       count:
 *                         type: integer
 *       401:
 *         description: "Unauthorized - Authentication required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET() {
	try {
		const authResult = await requireClientAuth();
		if (!authResult.success) {
			return authResult.response;
		}
		const { userId } = authResult;

		const repository = getClientItemRepository();
		const geoStats = await repository.getGeoStatsByUser(userId);

		return NextResponse.json({
			success: true,
			...geoStats,
		});
	} catch (error) {
		return serverErrorResponse(error, 'Failed to fetch geographic statistics');
	}
}
