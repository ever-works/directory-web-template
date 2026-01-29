import { NextResponse } from 'next/server';
import { requireClientAuth, serverErrorResponse } from '@/lib/utils/client-auth';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';

/**
 * @swagger
 * /api/client/items/coordinates:
 *   get:
 *     tags: ["Client - Dashboard"]
 *     summary: "Get coordinates for the client's items"
 *     description: "Returns slug, name, latitude, and longitude for all items belonging to the authenticated user that have location coordinates."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Coordinates retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       slug:
 *                         type: string
 *                         example: "my-item"
 *                       name:
 *                         type: string
 *                         example: "My Item"
 *                       latitude:
 *                         type: number
 *                         example: 40.7128
 *                       longitude:
 *                         type: number
 *                         example: -74.006
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
 *                   example: "Failed to fetch item coordinates"
 */
export async function GET() {
	try {
		const authResult = await requireClientAuth();
		if (!authResult.success) {
			return authResult.response;
		}
		const { userId } = authResult;

		const repository = getClientItemRepository();
		const coordinates = await repository.getCoordinatesByUser(userId);

		return NextResponse.json({ success: true, coordinates });
	} catch (error) {
		return serverErrorResponse(error, 'Failed to fetch item coordinates');
	}
}
