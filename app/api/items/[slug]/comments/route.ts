import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommentsByItemId, createComment, getCommentWithUserById, getClientProfileByUserId } from "@/lib/db/queries";
import { isUserBlocked, getBlockReasonMessage } from "@/lib/db/queries/moderation.queries";
import { checkDatabaseAvailability } from "@/lib/utils/database-check";

/**
 * @swagger
 * /api/items/{itemId}/comments:
 *   get:
 *     tags: ["Item Comments"]
 *     summary: "Get item comments"
 *     description: "Returns all comments for a specific item including user information, ratings, and timestamps. Comments are returned with associated user profiles for display purposes. This is a public endpoint that doesn't require authentication."
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to get comments for"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Comments retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: "Comment ID"
 *                         example: "comment_123abc"
 *                       content:
 *                         type: string
 *                         description: "Comment content"
 *                         example: "This is an amazing tool! Really helped boost my productivity."
 *                       rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                         description: "User rating for the item"
 *                         example: 5
 *                       userId:
 *                         type: string
 *                         description: "ID of the user who wrote the comment"
 *                         example: "client_456def"
 *                       itemId:
 *                         type: string
 *                         description: "ID of the item being commented on"
 *                         example: "item_123abc"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: "When the comment was created"
 *                         example: "2024-01-20T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: "When the comment was last updated"
 *                         example: "2024-01-20T10:30:00.000Z"
 *                       deletedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: "When the comment was deleted (null if not deleted)"
 *                         example: null
 *                       user:
 *                         type: object
 *                         description: "User profile information"
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "client_456def"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john.doe@example.com"
 *                           avatar:
 *                             type: string
 *                             nullable: true
 *                             example: "https://example.com/avatars/john.jpg"
 *               required: ["success", "comments"]
 *             example:
 *               success: true
 *               comments:
 *                 - id: "comment_123abc"
 *                   content: "This is an amazing tool! Really helped boost my productivity."
 *                   rating: 5
 *                   userId: "client_456def"
 *                   itemId: "item_123abc"
 *                   createdAt: "2024-01-20T10:30:00.000Z"
 *                   updatedAt: "2024-01-20T10:30:00.000Z"
 *                   deletedAt: null
 *                   user:
 *                     id: "client_456def"
 *                     name: "John Doe"
 *                     email: "john.doe@example.com"
 *                     avatar: "https://example.com/avatars/john.jpg"
 *                 - id: "comment_789ghi"
 *                   content: "Good tool, but could use some improvements in the UI."
 *                   rating: 4
 *                   userId: "client_789ghi"
 *                   itemId: "item_123abc"
 *                   createdAt: "2024-01-19T15:20:00.000Z"
 *                   updatedAt: "2024-01-19T15:20:00.000Z"
 *                   deletedAt: null
 *                   user:
 *                     id: "client_789ghi"
 *                     name: "Jane Smith"
 *                     email: "jane.smith@example.com"
 *                     avatar: null
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
 *                   example: "Failed to fetch comments"
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Check database availability
    const dbCheck = checkDatabaseAvailability();
    if (dbCheck) return dbCheck;

    const itemComments = await getCommentsByItemId((await params).slug);

    return NextResponse.json({
      success: true,
      comments: itemComments
    });
  } catch (error) {
    // Only log errors in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error("Failed to fetch comments:", error);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/items/{itemId}/comments:
 *   post:
 *     tags: ["Item Comments"]
 *     summary: "Create item comment"
 *     description: "Creates a new comment for a specific item with a rating. Requires user authentication and a valid client profile. The comment content is required and the rating must be between 1 and 5. Returns the created comment with user information."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to comment on"
 *         example: "awesome-productivity-tool"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: "Comment content (required, non-empty)"
 *                 example: "This is an amazing tool! Really helped boost my productivity."
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: "Rating for the item (1-5 stars)"
 *                 example: 5
 *             required: ["content", "rating"]
 *     responses:
 *       200:
 *         description: "Comment created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 comment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Generated comment ID"
 *                       example: "comment_123abc"
 *                     content:
 *                       type: string
 *                       description: "Comment content"
 *                       example: "This is an amazing tool! Really helped boost my productivity."
 *                     rating:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 5
 *                       description: "User rating for the item"
 *                       example: 5
 *                     userId:
 *                       type: string
 *                       description: "ID of the user who wrote the comment"
 *                       example: "client_456def"
 *                     itemId:
 *                       type: string
 *                       description: "ID of the item being commented on"
 *                       example: "item_123abc"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: "When the comment was created"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "When the comment was last updated"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "When the comment was deleted (null if not deleted)"
 *                       example: null
 *                     user:
 *                       type: object
 *                       description: "User profile information"
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "client_456def"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         avatar:
 *                           type: string
 *                           nullable: true
 *                           example: "https://example.com/avatars/john.jpg"
 *               required: ["success", "comment"]
 *             example:
 *               success: true
 *               comment:
 *                 id: "comment_123abc"
 *                 content: "This is an amazing tool! Really helped boost my productivity."
 *                 rating: 5
 *                 userId: "client_456def"
 *                 itemId: "item_123abc"
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T10:30:00.000Z"
 *                 deletedAt: null
 *                 user:
 *                   id: "client_456def"
 *                   name: "John Doe"
 *                   email: "john.doe@example.com"
 *                   avatar: "https://example.com/avatars/john.jpg"
 *       400:
 *         description: "Bad request - Invalid input data"
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
 *                   examples:
 *                     empty_content: "Content is required"
 *                     invalid_rating: "Rating must be between 1 and 5"
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
 *                   example: "Authentication required"
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
 *                   example: "Failed to create comment"
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Check database availability
    const dbCheck = checkDatabaseAvailability();
    if (dbCheck) return dbCheck;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { content, rating } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const clientProfile = await getClientProfileByUserId(session.user.id!);
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

    const comment = await createComment({
      content,
      rating,
      userId: clientProfile.id,
      itemId: (await params).slug,
    });

    const commentWithUser = await getCommentWithUserById(comment.id);

    if (!commentWithUser) {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: commentWithUser
    });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create comment" },
      { status: 500 }
    );
  }
} 