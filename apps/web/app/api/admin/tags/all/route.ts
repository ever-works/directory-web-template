import { auth } from "@/lib/auth";
import { getCachedItems } from "@/lib/content";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/tags/all:
 *   get:
 *     tags: ["Admin - Tags"]
 *     summary: "Get all tags"
 *     description: "Retrieves a specific tag by its ID with complete details including usage statistics and metadata. Used for tag editing and detailed view in admin interfaces. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "locale"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           default: "en"
 *         description: "Locale for fetching tags"
 *         example: "en"
 *     responses:
 *       200:
 *         description: "Tags retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Tag"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "productivity"
 *                 name: "Productivity"
 *                 isActive: true
 *                 itemCount: 156
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T10:30:00.000Z"
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Tag not found"
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
 *                   example: "Tag not found"
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
 *                   example: "Failed to fetch tag"
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const locale = searchParams.get('locale') || 'en';

		if (locale && typeof locale !== 'string') {
			return NextResponse.json({ success: false, error: 'Invalid locale parameter' }, { status: 400 });
		}

		const { tags } = await getCachedItems({ lang: locale });
		return NextResponse.json({
			success: true,
			data: tags
		});
	} catch (error) {
		console.error('Error fetching tags:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch tags' }, { status: 500 });
	}
}