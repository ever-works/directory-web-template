import { auth } from '@/lib/auth';
import { getVoteByUserIdAndItemId, getClientProfileByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/items/{slug}/votes/status:
 *   get:
 *     tags: ["Item Votes"]
 *     summary: "Get user vote status"
 *     description: "Returns the current authenticated user's vote status for a specific item. Returns the complete vote record if the user has voted, or null if no vote exists. Requires user authentication and a valid client profile."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to get vote status for"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Vote status retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: "User has voted"
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Vote record ID"
 *                       example: "vote_123abc"
 *                     userId:
 *                       type: string
 *                       description: "User ID who cast the vote"
 *                       example: "client_456def"
 *                     itemId:
 *                       type: string
 *                       description: "Item ID that was voted on"
 *                       example: "item_123abc"
 *                     voteType:
 *                       type: string
 *                       enum: ["UPVOTE", "DOWNVOTE"]
 *                       description: "Type of vote cast"
 *                       example: "UPVOTE"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: "When the vote was cast"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "When the vote was last updated"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                 - type: "null"
 *                   description: "User has not voted"
 *             examples:
 *               upvote_status:
 *                 summary: "User has upvoted"
 *                 value:
 *                   id: "vote_123abc"
 *                   userId: "client_456def"
 *                   itemId: "item_123abc"
 *                   voteType: "UPVOTE"
 *                   createdAt: "2024-01-20T10:30:00.000Z"
 *                   updatedAt: "2024-01-20T10:30:00.000Z"
 *               downvote_status:
 *                 summary: "User has downvoted"
 *                 value:
 *                   id: "vote_789ghi"
 *                   userId: "client_456def"
 *                   itemId: "item_123abc"
 *                   voteType: "DOWNVOTE"
 *                   createdAt: "2024-01-19T15:20:00.000Z"
 *                   updatedAt: "2024-01-19T15:20:00.000Z"
 *               no_vote:
 *                 summary: "User has not voted"
 *                 value: null
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Authentication required"
 *       404:
 *         description: "Client profile not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Client profile not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch vote status"
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { slug } = await context.params;
    const clientProfile = await getClientProfileByUserId(session.user.id);
    if (!clientProfile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    }
    
    const votes = await getVoteByUserIdAndItemId(clientProfile.id, slug);
    return NextResponse.json(votes[0] || null);
  } catch (error) {
    console.error('Error fetching vote status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote status' },
      { status: 500 }
    );
  }
} 