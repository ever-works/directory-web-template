import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { getTenantId } from '@/lib/auth/tenant';
import { validateFavoriteInput } from '@/lib/validations/favorite';

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     tags: ["Favorites"]
 *     summary: "Get user favorites"
 *     description: "Returns a list of all items favorited by the authenticated user, ordered by creation date (oldest first). Each favorite includes item metadata like name, icon, and category for display purposes. Requires user authentication."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "User favorites retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 favorites:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: "Favorite record ID"
 *                         example: "fav_123abc"
 *                       userId:
 *                         type: string
 *                         description: "User ID who favorited the item"
 *                         example: "user_456def"
 *                       itemSlug:
 *                         type: string
 *                         description: "Item slug identifier"
 *                         example: "awesome-productivity-tool"
 *                       itemName:
 *                         type: string
 *                         description: "Item display name"
 *                         example: "Awesome Productivity Tool"
 *                       itemIconUrl:
 *                         type: string
 *                         nullable: true
 *                         description: "Item icon URL"
 *                         example: "https://example.com/icons/tool.png"
 *                       itemCategory:
 *                         type: string
 *                         nullable: true
 *                         description: "Item category"
 *                         example: "productivity"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: "When the item was favorited"
 *                         example: "2024-01-20T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: "When the favorite was last updated"
 *                         example: "2024-01-20T10:30:00.000Z"
 *               required: ["success", "favorites"]
 *             example:
 *               success: true
 *               favorites:
 *                 - id: "fav_123abc"
 *                   userId: "user_456def"
 *                   itemSlug: "awesome-productivity-tool"
 *                   itemName: "Awesome Productivity Tool"
 *                   itemIconUrl: "https://example.com/icons/tool.png"
 *                   itemCategory: "productivity"
 *                   createdAt: "2024-01-20T10:30:00.000Z"
 *                   updatedAt: "2024-01-20T10:30:00.000Z"
 *                 - id: "fav_789ghi"
 *                   userId: "user_456def"
 *                   itemSlug: "great-design-app"
 *                   itemName: "Great Design App"
 *                   itemIconUrl: "https://example.com/icons/design.png"
 *                   itemCategory: "design"
 *                   createdAt: "2024-01-19T15:20:00.000Z"
 *                   updatedAt: "2024-01-19T15:20:00.000Z"
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
 *                   example: "Failed to fetch favorites"
 */
export async function GET() {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const userFavorites = await db
			.select()
			.from(favorites)
			.where(and(eq(favorites.userId, session.user.id), eq(favorites.tenantId, tenantId)))
			.orderBy(favorites.createdAt);

		return NextResponse.json({
			success: true,
			favorites: userFavorites
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to fetch favorites');
	}
}

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     tags: ["Favorites"]
 *     summary: "Add item to favorites"
 *     description: "Adds an item to the authenticated user's favorites list. Includes duplicate checking to prevent adding the same item twice. Stores item metadata for quick access without needing to query the items table. Strings are trimmed and bounded (itemSlug 200, itemName 300, itemIconUrl 2048, itemCategory 200 characters); a malformed JSON body or an invalid field is a 400, and losing a race with a concurrent add of the same item is a 409. Requires user authentication."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemSlug:
 *                 type: string
 *                 minLength: 1
 *                 description: "Unique item slug identifier"
 *                 example: "awesome-productivity-tool"
 *               itemName:
 *                 type: string
 *                 minLength: 1
 *                 description: "Item display name"
 *                 example: "Awesome Productivity Tool"
 *               itemIconUrl:
 *                 type: string
 *                 format: uri
 *                 description: "Optional item icon URL"
 *                 example: "https://example.com/icons/tool.png"
 *               itemCategory:
 *                 type: string
 *                 description: "Optional item category"
 *                 example: "productivity"
 *             required: ["itemSlug", "itemName"]
 *     responses:
 *       201:
 *         description: "Item added to favorites successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 favorite:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Generated favorite record ID"
 *                       example: "fav_123abc"
 *                     userId:
 *                       type: string
 *                       description: "User ID who favorited the item"
 *                       example: "user_456def"
 *                     itemSlug:
 *                       type: string
 *                       description: "Item slug identifier"
 *                       example: "awesome-productivity-tool"
 *                     itemName:
 *                       type: string
 *                       description: "Item display name"
 *                       example: "Awesome Productivity Tool"
 *                     itemIconUrl:
 *                       type: string
 *                       nullable: true
 *                       description: "Item icon URL"
 *                       example: "https://example.com/icons/tool.png"
 *                     itemCategory:
 *                       type: string
 *                       nullable: true
 *                       description: "Item category"
 *                       example: "productivity"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: "When the item was favorited"
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: "When the favorite was last updated"
 *                       example: "2024-01-20T10:30:00.000Z"
 *               required: ["success", "favorite"]
 *             example:
 *               success: true
 *               favorite:
 *                 id: "fav_123abc"
 *                 userId: "user_456def"
 *                 itemSlug: "awesome-productivity-tool"
 *                 itemName: "Awesome Productivity Tool"
 *                 itemIconUrl: "https://example.com/icons/tool.png"
 *                 itemCategory: "productivity"
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T10:30:00.000Z"
 *       400:
 *         description: "Bad request - Invalid request data"
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
 *                   example: "Invalid request data"
 *                 details:
 *                   type: string
 *                   description: "Detailed validation error message"
 *                   example: "itemSlug is required and must be a non-empty string"
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
 *       409:
 *         description: "Conflict - Item already in favorites"
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
 *                   example: "Item is already in favorites"
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
 *                   example: "Failed to add favorite"
 */
export async function POST(request: NextRequest) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
		}

		const input = validateFavoriteInput(body);
		if (!input.ok) {
			return NextResponse.json(
				{ success: false, error: 'Invalid request data', details: input.error },
				{ status: 400 }
			);
		}
		const validatedData = input.value;

		// Check if favorite already exists
		const existingFavorite = await db
			.select()
			.from(favorites)
			.where(
				and(
					eq(favorites.userId, session.user.id),
					eq(favorites.itemSlug, validatedData.itemSlug),
					eq(favorites.tenantId, tenantId)
				)
			)
			.limit(1);

		if (existingFavorite.length > 0) {
			return NextResponse.json({ success: false, error: 'Item is already in favorites' }, { status: 409 });
		}

		// The (user, item) unique index decides a race between two concurrent adds
		// (a double click): the loser inserts nothing and answers 409, not a 500.
		const newFavorite = await db
			.insert(favorites)
			.values({
				userId: session.user.id,
				itemSlug: validatedData.itemSlug,
				itemName: validatedData.itemName,
				itemIconUrl: validatedData.itemIconUrl,
				itemCategory: validatedData.itemCategory,
				tenantId
			})
			.onConflictDoNothing()
			.returning();

		if (newFavorite.length === 0) {
			return NextResponse.json({ success: false, error: 'Item is already in favorites' }, { status: 409 });
		}

		return NextResponse.json(
			{
				success: true,
				favorite: newFavorite[0]
			},
			{ status: 201 }
		);
	} catch (error) {
		return safeErrorResponse(error, 'Failed to add favorite');
	}
}
