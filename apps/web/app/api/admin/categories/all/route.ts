import { auth } from '@/lib/auth';
import { getCachedItems } from '@/lib/content';
import { NextRequest, NextResponse } from 'next/server';


/**
 * @swagger
 * /api/admin/categories/all:
 *   get:
 *     tags: ["Admin - Categories"]
 *     summary: "Get all categories"
 *     description: "Returns all categories in the system. Used for category management in admin interfaces. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Category ID"
 *         example: "productivity"
 *     responses:
 *       200:
 *         description: "Category retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Category"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "productivity"
 *                 name: "Productivity"
 *                 isActive: true
 *                 itemCount: 15
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 updatedAt: "2024-01-15T10:30:00.000Z"
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
 *       404:
 *         description: "Categories not found"
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
 *                   example: "Categories not found"
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
 *                   example: "Failed to fetch category"
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Get locale from query parameters instead of body
		const { searchParams } = new URL(request.url);
		const locale = searchParams.get('locale') || 'en';

		const { categories } = await getCachedItems({ lang: locale });
		return NextResponse.json({ success: true, data: categories });
	} catch (error) {
		console.error('Error fetching categories:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
	}
}