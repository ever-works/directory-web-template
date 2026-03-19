import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { comments, clientProfiles } from '@/lib/db/schema';
import { and, count, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { getTenantId } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

interface ListResponseUser {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
}

interface ListResponseComment {
	id: string;
	content: string;
	rating: number | null;
	userId: string;
	itemId: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	user: ListResponseUser;
}

/**
 * @swagger
 * /api/admin/comments:
 *   get:
 *     tags: ["Admin - Comments"]
 *     summary: "Get paginated comments list"
 *     description: "Returns a paginated list of comments with user information and search functionality. Supports filtering by comment content, user name, or user email. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number for pagination"
 *         example: 1
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: "Number of comments per page"
 *         example: 10
 *       - name: "search"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Search term for comment content, user name, or user email"
 *         example: "great product"
 *     responses:
 *       200:
 *         description: "Comments list retrieved successfully"
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
 *                     comments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: "Comment ID"
 *                             example: "comment_123abc"
 *                           content:
 *                             type: string
 *                             description: "Comment content"
 *                             example: "This is a great product! Highly recommended."
 *                           rating:
 *                             type: integer
 *                             nullable: true
 *                             minimum: 1
 *                             maximum: 5
 *                             description: "Rating given with the comment"
 *                             example: 5
 *                           userId:
 *                             type: string
 *                             description: "ID of the user who wrote the comment"
 *                             example: "user_456def"
 *                           itemId:
 *                             type: string
 *                             description: "ID of the item being commented on"
 *                             example: "item_789ghi"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: "Comment creation timestamp"
 *                             example: "2024-01-20T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: "Comment last update timestamp"
 *                             example: "2024-01-20T14:45:00.000Z"
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 description: "User ID"
 *                                 example: "user_456def"
 *                               name:
 *                                 type: string
 *                                 nullable: true
 *                                 description: "User display name"
 *                                 example: "John Doe"
 *                               email:
 *                                 type: string
 *                                 nullable: true
 *                                 description: "User email address"
 *                                 example: "john.doe@example.com"
 *                               image:
 *                                 type: string
 *                                 nullable: true
 *                                 description: "User avatar image URL"
 *                                 example: "https://example.com/avatar.jpg"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: "Total number of comments"
 *                           example: 156
 *                         page:
 *                           type: integer
 *                           description: "Current page number"
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           description: "Number of comments per page"
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           description: "Total number of pages"
 *                           example: 16
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 comments:
 *                   - id: "comment_123abc"
 *                     content: "This is a great product! Highly recommended."
 *                     rating: 5
 *                     userId: "user_456def"
 *                     itemId: "item_789ghi"
 *                     createdAt: "2024-01-20T10:30:00.000Z"
 *                     updatedAt: "2024-01-20T10:30:00.000Z"
 *                     user:
 *                       id: "user_456def"
 *                       name: "John Doe"
 *                       email: "john.doe@example.com"
 *                       image: "https://example.com/avatar.jpg"
 *                   - id: "comment_234bcd"
 *                     content: "Good quality, fast delivery."
 *                     rating: 4
 *                     userId: "user_567efg"
 *                     itemId: "item_890jkl"
 *                     createdAt: "2024-01-19T15:20:00.000Z"
 *                     updatedAt: "2024-01-19T15:20:00.000Z"
 *                     user:
 *                       id: "user_567efg"
 *                       name: "Jane Smith"
 *                       email: "jane.smith@example.com"
 *                       image: null
 *                 pagination:
 *                   total: 156
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 16
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
export async function GET(request: Request) {
	try {
		// Check database availability first
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const page = Number(searchParams.get('page') || 1);
		const limit = Number(searchParams.get('limit') || 10);
		const search = (searchParams.get('search') || '').trim();
		const offset = (page - 1) * limit;

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const whereConditions: SQL[] = [isNull(comments.deletedAt), eq(comments.tenantId, tenantId)];
		if (search) {
			const escaped = search.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
			whereConditions.push(
				sql`(${comments.content} ILIKE ${`%${escaped}%`} OR ${clientProfiles.name} ILIKE ${`%${escaped}%`} OR ${clientProfiles.email} ILIKE ${`%${escaped}%`})`
			);
		}
		const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

		// Get total count - we need to recreate the where clause for count query
		const countWhereConditions: SQL[] = [isNull(comments.deletedAt), eq(comments.tenantId, tenantId)];
		if (search) {
			const escaped = search.replace(/[%_\\]/g, '\\$&');
			// For count, we need to check if user exists via subquery instead of join
			countWhereConditions.push(
				sql`(${comments.content} ILIKE ${`%${escaped}%`} OR EXISTS (
          SELECT 1 FROM ${clientProfiles}
          WHERE ${clientProfiles.id} = ${comments.userId}
          AND (${clientProfiles.name} ILIKE ${`%${escaped}%`} OR ${clientProfiles.email} ILIKE ${`%${escaped}%`})
        ))`
			);
		}
		const countWhereClause =
			countWhereConditions.length > 1 ? and(...countWhereConditions) : countWhereConditions[0];

		const totalResult = await db.select({ count: count() }).from(comments).where(countWhereClause);
		const total = Number(totalResult[0]?.count || 0);

		const rows = await db
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
			.where(whereClause)
			.orderBy(desc(comments.createdAt))
			.limit(limit)
			.offset(offset);

		const data: ListResponseComment[] = rows.map((r: any) => ({
			id: r.id,
			content: r.content ?? '',
			rating: r.rating ?? null,
			userId: r.userId ?? '',
			itemId: r.itemId ?? '',
			createdAt: r.createdAt ?? null,
			updatedAt: r.updatedAt ?? null,
			user: r.user
				? {
						id: r.user.id ?? '',
						name: r.user.name ?? null,
						email: r.user.email ?? null,
						image: r.user.image ?? null
					}
				: {
						id: '',
						name: 'Unknown User',
						email: '',
						image: null
					}
		}));

		return NextResponse.json({
			success: true,
			data: {
				comments: data,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.max(1, Math.ceil(total / limit))
				}
			}
		});
	} catch (error) {
		console.error('Failed to list comments:', error);
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
}
