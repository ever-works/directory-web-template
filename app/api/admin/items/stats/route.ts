import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { safeErrorResponse } from '@/lib/utils/api-error';

const itemRepository = new ItemRepository();

/**
 * @swagger
 * /api/admin/items/stats:
 *   get:
 *     tags: ["Admin - Items"]
 *     summary: "Get item statistics"
 *     description: "Returns basic statistics about items including total count and counts by status (draft, pending, approved, rejected). Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Item statistics retrieved successfully"
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
 *                     total:
 *                       type: integer
 *                       description: "Total number of items"
 *                       example: 1247
 *                     draft:
 *                       type: integer
 *                       description: "Number of draft items"
 *                       example: 45
 *                     pending:
 *                       type: integer
 *                       description: "Number of pending items"
 *                       example: 23
 *                     approved:
 *                       type: integer
 *                       description: "Number of approved items"
 *                       example: 1156
 *                     rejected:
 *                       type: integer
 *                       description: "Number of rejected items"
 *                       example: 23
 *                   required: ["total", "draft", "pending", "approved", "rejected"]
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 total: 1247
 *                 draft: 45
 *                 pending: 23
 *                 approved: 1156
 *                 rejected: 23
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
 *                   example: "Failed to fetch item stats"
 */
export async function GET(request: Request) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse filter query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const categoriesParam = searchParams.get('categories');
    const tagsParam = searchParams.get('tags');

    const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : undefined;
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;

    // Get stats from repository with filters
    const stats = await itemRepository.getStats({ search, categories, tags });

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch item stats');
  }
} 