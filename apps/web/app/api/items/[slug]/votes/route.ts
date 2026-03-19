import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    createVote,
    getVoteByUserIdAndItemId,
    getVoteCountForItem,
    deleteVote,
    getClientProfileByUserId
} from "@/lib/db/queries";
import { isUserBlocked, getBlockReasonMessage } from "@/lib/db/queries/moderation.queries";
import { VoteType } from "@/lib/db/schema";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * @swagger
 * /api/items/{slug}/votes:
 *   get:
 *     tags: ["Item Votes"]
 *     summary: "Get item vote information"
 *     description: "Returns the total vote count for an item and the current user's vote status if authenticated. The vote count represents the net score (upvotes - downvotes). User vote status shows whether the user has upvoted, downvoted, or not voted on the item."
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to get vote information for"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Vote information retrieved successfully"
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
 *                 userVote:
 *                   type: string
 *                   nullable: true
 *                   enum: ["up", "down", null]
 *                   description: "Current user's vote status (null if not authenticated or no vote)"
 *                   example: "up"
 *               required: ["success", "count", "userVote"]
 *             examples:
 *               authenticated_upvoted:
 *                 summary: "Authenticated user who upvoted"
 *                 value:
 *                   success: true
 *                   count: 15
 *                   userVote: "up"
 *               authenticated_downvoted:
 *                 summary: "Authenticated user who downvoted"
 *                 value:
 *                   success: true
 *                   count: -3
 *                   userVote: "down"
 *               authenticated_no_vote:
 *                 summary: "Authenticated user with no vote"
 *                 value:
 *                   success: true
 *                   count: 0
 *                   userVote: null
 *               unauthenticated:
 *                 summary: "Unauthenticated user"
 *                 value:
 *                   success: true
 *                   count: 20
 *                   userVote: null
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
 *                   example: "Internal server error"
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const [session, { slug }] = await Promise.all([
      auth(),
      Promise.resolve(context.params)
    ]);

    const count = await getVoteCountForItem(slug);

    let userVote = null;
    if (session?.user?.id) {
      const clientProfile = await getClientProfileByUserId(session.user.id);
      if (clientProfile) {
        const votes = await getVoteByUserIdAndItemId(clientProfile.id, slug);
        if (votes.length > 0) {
          userVote = votes[0].voteType === VoteType.UPVOTE ? "up" : "down";
        }
      }
    }

    return NextResponse.json({
      success: true,
      count,
      userVote
    });
  } catch (error) {
    console.error("Error in vote route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/items/{slug}/votes:
 *   post:
 *     tags: ["Item Votes"]
 *     summary: "Cast or update vote"
 *     description: "Casts a new vote or updates an existing vote for an item. If the user has already voted, the previous vote is replaced with the new one. Supports upvote ('up') and downvote ('down') types. Requires user authentication and a valid client profile."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to vote on"
 *         example: "awesome-productivity-tool"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: ["up", "down"]
 *                 description: "Vote type - 'up' for upvote, 'down' for downvote"
 *                 example: "up"
 *             required: ["type"]
 *     responses:
 *       200:
 *         description: "Vote cast successfully"
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
 *                   description: "Updated net vote count (upvotes - downvotes)"
 *                   example: 16
 *                 userVote:
 *                   type: string
 *                   enum: ["up", "down"]
 *                   description: "User's current vote status"
 *                   example: "up"
 *               required: ["success", "count", "userVote"]
 *             examples:
 *               upvote_cast:
 *                 summary: "Upvote cast successfully"
 *                 value:
 *                   success: true
 *                   count: 16
 *                   userVote: "up"
 *               downvote_cast:
 *                 summary: "Downvote cast successfully"
 *                 value:
 *                   success: true
 *                   count: 14
 *                   userVote: "down"
 *               vote_updated:
 *                 summary: "Previous vote updated"
 *                 value:
 *                   success: true
 *                   count: 18
 *                   userVote: "up"
 *       400:
 *         description: "Bad request - Invalid vote type"
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
 *                   example: "Invalid vote type. Must be 'up' or 'down'"
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Client profile not found"
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
 *                   example: "Client profile not found"
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
 *                   example: "Internal server error"
 */
export async function POST(
  request: Request,
  params: RouteParams
) {
  try {
    const [session, { slug }] = await Promise.all([
      auth(),
      Promise.resolve(params.params)
    ]);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { type } = await request.json();

    if (!type || (type !== "up" && type !== "down")) {
      return NextResponse.json(
        { success: false, error: "Invalid vote type. Must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    const clientProfile = await getClientProfileByUserId(session.user.id);
    if (!clientProfile) {
      return NextResponse.json(
        { success: false, error: "Client profile not found" },
        { status: 404 }
      );
    }

    // Check if user is blocked (suspended or banned)
    if (isUserBlocked(clientProfile.status)) {
      return NextResponse.json(
        { success: false, error: getBlockReasonMessage(clientProfile.status) },
        { status: 403 }
      );
    }

    const existingVotes = await getVoteByUserIdAndItemId(clientProfile.id, slug);
    if (existingVotes.length > 0) {
      await deleteVote(existingVotes[0].id);
    }

    const voteType = type === "up" ? VoteType.UPVOTE : VoteType.DOWNVOTE;
    await createVote({
      userId: clientProfile.id,
      itemId: slug,
      voteType
    });

    const count = await getVoteCountForItem(slug);

    return NextResponse.json({
      success: true,
      count,
      userVote: type
    });
  } catch (error) {
    console.error("Error in vote route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/items/{slug}/votes:
 *   delete:
 *     tags: ["Item Votes"]
 *     summary: "Remove user vote"
 *     description: "Removes the current user's vote from an item if one exists. This effectively 'unvotes' the item, returning the user to a neutral state. Requires user authentication and a valid client profile."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to remove vote from"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Vote removed successfully"
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
 *                   description: "Updated net vote count after removal"
 *                   example: 14
 *                 userVote:
 *                   type: null
 *                   description: "User vote status (always null after removal)"
 *                   example: null
 *               required: ["success", "count", "userVote"]
 *             example:
 *               success: true
 *               count: 14
 *               userVote: null
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Client profile not found"
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
 *                   example: "Client profile not found"
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
 *                   example: "Internal server error"
 */
export async function DELETE(
  request: Request,
  params: RouteParams
) {
  try {
    const [session, { slug }] = await Promise.all([
      auth(),
      Promise.resolve(params.params)
    ]);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const clientProfile = await getClientProfileByUserId(session.user.id);
    if (!clientProfile) {
      return NextResponse.json(
        { success: false, error: "Client profile not found" },
        { status: 404 }
      );
    }

    const existingVotes = await getVoteByUserIdAndItemId(clientProfile.id, slug);
    if (existingVotes.length > 0) {
      await deleteVote(existingVotes[0].id);
    }

    const count = await getVoteCountForItem(slug);
    return NextResponse.json({
      success: true,
      count,
      userVote: null
    });
  } catch (error) {
    console.error("Error in vote route:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 