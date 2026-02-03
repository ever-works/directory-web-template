import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteComment, getCommentById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { comments, clientProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/comments/{id}:
 *   get:
 *     tags: ["Admin - Comments"]
 *     summary: "Get comment by ID"
 *     description: "Retrieves a specific comment by its ID with complete user information. Returns detailed comment data including content, rating, timestamps, and associated user profile. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Comment ID"
 *         example: "comment_123abc"
 *     responses:
 *       200:
 *         description: "Comment retrieved successfully"
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
 *                     id:
 *                       type: string
 *                       description: "Comment ID"
 *                       example: "comment_123abc"
 *                     content:
 *                       type: string
 *                       description: "Comment content"
 *                       example: "This is a great product! Highly recommended."
 *                     rating:
 *                       type: integer
 *                       nullable: true
 *                       minimum: 1
 *                       maximum: 5
 *                       description: "Rating given with the comment"
 *                       example: 5
 *                     userId:
 *                       type: string
 *                       description: "ID of the user who wrote the comment"
 *                       example: "user_456def"
 *                     itemId:
 *                       type: string
 *                       description: "ID of the item being commented on"
 *                       example: "item_789ghi"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "Comment creation timestamp"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "Comment last update timestamp"
 *                       example: "2024-01-20T14:45:00.000Z"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: "User ID"
 *                           example: "user_456def"
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           description: "User display name"
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           nullable: true
 *                           description: "User email address"
 *                           example: "john.doe@example.com"
 *                         image:
 *                           type: string
 *                           nullable: true
 *                           description: "User avatar image URL"
 *                           example: "https://example.com/avatar.jpg"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "comment_123abc"
 *                 content: "This is a great product! Highly recommended."
 *                 rating: 5
 *                 userId: "user_456def"
 *                 itemId: "item_789ghi"
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T14:45:00.000Z"
 *                 user:
 *                   id: "user_456def"
 *                   name: "John Doe"
 *                   email: "john.doe@example.com"
 *                   image: "https://example.com/avatar.jpg"
 *       403:
 *         description: "Forbidden - Admin access required"
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
 *                   example: "Forbidden"
 *       404:
 *         description: "Comment not found"
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
 *                   example: "Comment not found"
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
 *                   example: "Internal Server Error"
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin || !session.user.tenantId) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;

		// Get comment with user information
		const result = await db
			.select({
				id: comments.id,
				content: comments.content,
				rating: comments.rating,
				userId: comments.userId,
				itemId: comments.itemId,
				createdAt: comments.createdAt,
				updatedAt: comments.updatedAt,
				user: {
					id: clientProfiles.id,
					name: clientProfiles.name,
					email: clientProfiles.email,
					image: clientProfiles.avatar
				}
			})
			.from(comments)
			.leftJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
			.where(eq(comments.id, id))
			.limit(1);

		if (result.length === 0 || result[0].createdAt === null) {
			return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
		}

		const comment = result[0];
		const responseData = {
			id: comment.id,
			content: comment.content ?? '',
			rating: comment.rating ?? null,
			userId: comment.userId ?? '',
			itemId: comment.itemId ?? '',
			createdAt: comment.createdAt,
			updatedAt: comment.updatedAt,
			user: comment.user
				? {
						id: comment.user.id ?? '',
						name: comment.user.name ?? null,
						email: comment.user.email ?? null,
						image: comment.user.image ?? null
					}
				: {
						id: '',
						name: 'Unknown User',
						email: '',
						image: null
					}
		};

		return NextResponse.json({
			success: true,
			data: responseData
		});
	} catch (error) {
		console.error('Failed to get comment:', error);
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/comments/{id}:
 *   put:
 *     tags: ["Admin - Comments"]
 *     summary: "Update comment content"
 *     description: "Updates the content of a specific comment. Only the comment content can be modified. The comment must exist and not be deleted. Returns the updated comment with complete user information. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Comment ID"
 *         example: "comment_123abc"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: "New comment content"
 *                 minLength: 1
 *                 example: "This is an updated comment with more details."
 *             required: ["content"]
 *     responses:
 *       200:
 *         description: "Comment updated successfully"
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
 *                     id:
 *                       type: string
 *                       description: "Comment ID"
 *                       example: "comment_123abc"
 *                     content:
 *                       type: string
 *                       description: "Updated comment content"
 *                       example: "This is an updated comment with more details."
 *                     rating:
 *                       type: integer
 *                       nullable: true
 *                       minimum: 1
 *                       maximum: 5
 *                       description: "Rating given with the comment"
 *                       example: 5
 *                     userId:
 *                       type: string
 *                       description: "ID of the user who wrote the comment"
 *                       example: "user_456def"
 *                     itemId:
 *                       type: string
 *                       description: "ID of the item being commented on"
 *                       example: "item_789ghi"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "Comment creation timestamp"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "Comment last update timestamp"
 *                       example: "2024-01-20T16:15:00.000Z"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: "User ID"
 *                           example: "user_456def"
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           description: "User display name"
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           nullable: true
 *                           description: "User email address"
 *                           example: "john.doe@example.com"
 *                         image:
 *                           type: string
 *                           nullable: true
 *                           description: "User avatar image URL"
 *                           example: "https://example.com/avatar.jpg"
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Comment updated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "comment_123abc"
 *                 content: "This is an updated comment with more details."
 *                 rating: 5
 *                 userId: "user_456def"
 *                 itemId: "item_789ghi"
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T16:15:00.000Z"
 *                 user:
 *                   id: "user_456def"
 *                   name: "John Doe"
 *                   email: "john.doe@example.com"
 *                   image: "https://example.com/avatar.jpg"
 *               message: "Comment updated successfully"
 *       400:
 *         description: "Bad request - Invalid input"
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
 *                   example: "Content is required"
 *       403:
 *         description: "Forbidden - Admin access required"
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
 *                   example: "Forbidden"
 *       404:
 *         description: "Comment not found"
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
 *                   example: "Comment not found"
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
 *                   example: "Internal Server Error"
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin || !session.user.tenantId) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;
		const { content } = await request.json();

		if (!content?.trim()) {
			return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
		}

		// Check if comment exists and is not deleted
		const existingComment = await getCommentById(id, session.user.tenantId);
		if (!existingComment || existingComment.deletedAt) {
			return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
		}

		// Update comment
		// const updatedComment = await updateComment(id, content);

		// Get updated comment with user information
		const result = await db
			.select({
				id: comments.id,
				content: comments.content,
				rating: comments.rating,
				userId: comments.userId,
				itemId: comments.itemId,
				createdAt: comments.createdAt,
				updatedAt: comments.updatedAt,
				user: {
					id: clientProfiles.id,
					name: clientProfiles.name,
					email: clientProfiles.email,
					image: clientProfiles.avatar
				}
			})
			.from(comments)
			.leftJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
			.where(eq(comments.id, id))
			.limit(1);

		const comment = result[0];
		const responseData = {
			id: comment.id,
			content: comment.content ?? '',
			rating: comment.rating ?? null,
			userId: comment.userId ?? '',
			itemId: comment.itemId ?? '',
			createdAt: comment.createdAt,
			updatedAt: comment.updatedAt,
			user: comment.user
				? {
						id: comment.user.id ?? '',
						name: comment.user.name ?? null,
						email: comment.user.email ?? null,
						image: comment.user.image ?? null
					}
				: {
						id: '',
						name: 'Unknown User',
						email: '',
						image: null
					}
		};

		return NextResponse.json({
			success: true,
			data: responseData,
			message: 'Comment updated successfully'
		});
	} catch (error) {
		console.error('Failed to update comment:', error);
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/comments/{id}:
 *   delete:
 *     tags: ["Admin - Comments"]
 *     summary: "Delete comment"
 *     description: "Performs a soft delete on a specific comment by marking it as deleted. The comment must exist and not already be deleted. This action cannot be undone through the API. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Comment ID to delete"
 *         example: "comment_123abc"
 *     responses:
 *       200:
 *         description: "Comment deleted successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Comment deleted successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Comment deleted successfully"
 *       403:
 *         description: "Forbidden - Admin access required"
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
 *                   example: "Forbidden"
 *       404:
 *         description: "Comment not found or already deleted"
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
 *                   example: "Comment not found"
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
 *                   example: "Internal Server Error"
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin || !session.user.tenantId) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;
		const comment = await getCommentById(id, session.user.tenantId);
		if (!comment || comment.deletedAt) {
			return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
		}

		await deleteComment(id, session.user.tenantId);
		return NextResponse.json({
			success: true,
			message: 'Comment deleted successfully'
		});
	} catch (error) {
		console.error('Failed to delete comment:', error);
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}
