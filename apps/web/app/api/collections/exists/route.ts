import { NextRequest, NextResponse } from 'next/server';
import { collectionRepository } from '@/lib/repositories/collection.repository';

/**
 * @swagger
 * /api/collections/exists:
 *   get:
 *     tags: ["Collections"]
 *     summary: "Check if collections exist"
 *     description: "Checks if there are any active collections available in the system. Returns a boolean indicating existence and the count of active collections. This is a public endpoint that doesn't require authentication."
 *     responses:
 *       200:
 *         description: "Collections existence checked successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: "Whether any active collections exist"
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: "Number of active collections"
 *                   example: 5
 *               required: ["exists", "count"]
 *             examples:
 *               collections_exist:
 *                 summary: "Collections exist"
 *                 value:
 *                   exists: true
 *                   count: 5
 *               no_collections:
 *                 summary: "No collections exist"
 *                 value:
 *                   exists: false
 *                   count: 0
 *       500:
 *         description: "Internal server error - Failed to check collections existence"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   example: false
 *                 count:
 *                   type: integer
 *                   example: 0
 *                 error:
 *                   type: string
 *                   description: "Generic error message (detailed errors are logged server-side only)"
 *                   example: "Failed to check collections existence"
 *               required: ["exists", "count", "error"]
 */
export async function GET(_request: NextRequest) {
	try {
		// Fetch only active collections (default behavior of findAll)
		const collections = await collectionRepository.findAll({ includeInactive: false });

		const hasCollections = Array.isArray(collections) && collections.length > 0;

		return NextResponse.json({
			exists: hasCollections,
			count: collections?.length || 0
		});
	} catch (error) {
		// Log detailed error server-side for debugging
		console.error('Error checking collections existence:', error);
		// Return generic error message to client to avoid information disclosure
		return NextResponse.json(
			{
				exists: false,
				count: 0,
				error: 'Failed to check collections existence'
			},
			{ status: 500 }
		);
	}
}
