import { getVoteCountForItem } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/items/{slug}/votes/count:
 *   get:
 *     tags: ["Item Votes"]
 *     summary: "Get item vote count"
 *     description: "Returns the total vote count for a specific item. The count represents the net score (upvotes - downvotes). This is a public endpoint that doesn't require authentication and is optimized for quick vote count retrieval."
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to get vote count for"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Vote count retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: "Net vote count (upvotes - downvotes)"
 *                   example: 15
 *               required: ["success", "count"]
 *             examples:
 *               positive_score:
 *                 summary: "Item with positive score"
 *                 value:
 *                   success: true
 *                   count: 15
 *               negative_score:
 *                 summary: "Item with negative score"
 *                 value:
 *                   success: true
 *                   count: -3
 *               zero_score:
 *                 summary: "Item with no votes or equal votes"
 *                 value:
 *                   success: true
 *                   count: 0
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
 *                   example: "Failed to fetch vote count"
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const count = await getVoteCountForItem(slug);
    return NextResponse.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching vote count:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vote count' },
      { status: 500 }
    );
  }
} 