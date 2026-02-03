import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteComment, getClientProfileByUserId, updateComment } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { comments, clientProfiles } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

/**
 * @swagger
 * /api/items/{slug}/comments/{commentId}:
 *   delete:
 *     tags: ["Item Comments"]
 *     summary: "Delete comment"
 *     description: "Deletes a specific comment. Only the comment author can delete their own comment. The comment is soft-deleted (marked as deleted) rather than permanently removed from the database. Requires user authentication and ownership verification."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug that the comment belongs to"
 *         example: "awesome-productivity-tool"
 *       - name: "commentId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Comment ID to delete"
 *         example: "comment_456def"
 *     responses:
 *       204:
 *         description: "Comment deleted successfully (no content returned)"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Unauthorized"
 *       404:
 *         description: "Comment not found, client profile not found, or not authorized to delete"
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               examples:
 *                 client_not_found: "Client profile not found"
 *                 comment_not_found: "Comment not found or not authorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Internal Server Error"
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; commentId: string }> }) {
	// Check database availability
	const dbCheck = checkDatabaseAvailability();
	if (dbCheck) return dbCheck;

	const session = await auth();
	if (!session?.user?.id || !session.user.tenantId) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const clientProfile = await getClientProfileByUserId(session.user.id, session.user.tenantId);
		if (!clientProfile) {
			return new NextResponse('Client profile not found', { status: 404 });
		}

		const [comment] = await db
			.select()
			.from(comments)
			.where(
				and(
					eq(comments.id, (await params).commentId),
					eq(comments.userId, clientProfile.id),
					isNull(comments.deletedAt)
				)
			);

		if (!comment) {
			return new NextResponse('Comment not found or not authorized', { status: 404 });
		}

		await deleteComment((await params).commentId, session.user.tenantId);
		return new NextResponse(null, { status: 204 });
	} catch (error) {
		console.error('Error deleting comment:', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}

/**
 * @swagger
 * /api/items/{slug}/comments/{commentId}:
 *   put:
 *     tags: ["Item Comments"]
 *     summary: "Update comment"
 *     description: "Updates a specific comment's content and/or rating. Only the comment author can update their own comment. Requires user authentication and ownership verification."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug that the comment belongs to"
 *         example: "awesome-productivity-tool"
 *       - name: "commentId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Comment ID to update"
 *         example: "comment_456def"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: "Updated comment content"
 *                 example: "This is my updated review of this amazing tool!"
 *               rating:
 *                 type: integer
 *                 description: "Updated rating (1-5)"
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *     responses:
 *       200:
 *         description: "Comment updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 content:
 *                   type: string
 *                 rating:
 *                   type: integer
 *                 userId:
 *                   type: string
 *                 itemId:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 editedAt:
 *                   type: string
 *                   format: date-time
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     image:
 *                       type: string
 *       400:
 *         description: "Bad request - validation failed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Unauthorized"
 *       404:
 *         description: "Comment not found or not authorized to update"
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       500:
 *         description: "Internal server error"
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; commentId: string }> }) {
	// Check database availability
	const dbCheck = checkDatabaseAvailability();
	if (dbCheck) return dbCheck;

	const session = await auth();
	if (!session?.user?.id || !session.user.tenantId) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const clientProfile = await getClientProfileByUserId(session.user.id, session.user.tenantId);
		if (!clientProfile) {
			return new NextResponse('Client profile not found', { status: 404 });
		}

		const { commentId } = await params;
		const body = await request.json();
		const { content, rating } = body;

		// Validate at least one field is being updated
		if (content === undefined && rating === undefined) {
			return NextResponse.json({ error: 'At least one of content or rating must be provided' }, { status: 400 });
		}

		// Validate content if provided
		if (content !== undefined) {
			if (typeof content !== 'string') {
				return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
			}
			if (!content.trim() || content.length > 1000) {
				return NextResponse.json({ error: 'Content must be between 1 and 1000 characters' }, { status: 400 });
			}
		}

		// Validate rating if provided
		if (rating !== undefined) {
			if (typeof rating !== 'number' || !Number.isInteger(rating)) {
				return NextResponse.json({ error: 'Rating must be an integer' }, { status: 400 });
			}
			if (rating < 1 || rating > 5) {
				return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
			}
		}

		// Check if comment exists and user owns it
		const [existingComment] = await db
			.select()
			.from(comments)
			.where(and(eq(comments.id, commentId), eq(comments.userId, clientProfile.id), isNull(comments.deletedAt)));

		if (!existingComment) {
			return new NextResponse('Comment not found or not authorized', { status: 404 });
		}

		// Update comment
		await updateComment(commentId, session.user.tenantId, {
			...(content !== undefined && { content: content.trim() }),
			...(rating !== undefined && { rating })
		});

		// Fetch updated comment with user information
		const [updatedComment] = await db
			.select({
				id: comments.id,
				content: comments.content,
				rating: comments.rating,
				userId: comments.userId,
				itemId: comments.itemId,
				createdAt: comments.createdAt,
				updatedAt: comments.updatedAt,
				editedAt: comments.editedAt,
				deletedAt: comments.deletedAt,
				user: {
					id: clientProfiles.id,
					name: clientProfiles.name,
					email: clientProfiles.email,
					image: clientProfiles.avatar
				}
			})
			.from(comments)
			.leftJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
			.where(eq(comments.id, commentId));

		return NextResponse.json(updatedComment, { status: 200 });
	} catch (error) {
		console.error('Error updating comment:', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
