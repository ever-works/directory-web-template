import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';

const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});

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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, session.user.id))
      .orderBy(favorites.createdAt);

    return NextResponse.json({
      success: true,
      favorites: userFavorites,
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
 *     description: "Adds an item to the authenticated user's favorites list. Includes duplicate checking to prevent adding the same item twice. Stores item metadata for quick access without needing to query the items table. Requires user authentication."
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = addFavoriteSchema.parse(body);

    // Check if favorite already exists
    const existingFavorite = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.itemSlug, validatedData.itemSlug)
        )
      )
      .limit(1);

    if (existingFavorite.length > 0) {
      return NextResponse.json(
        { success: false, error: "Item is already in favorites" },
        { status: 409 }
      );
    }

    const newFavorite = await db
      .insert(favorites)
      .values({
        userId: session.user.id,
        itemSlug: validatedData.itemSlug,
        itemName: validatedData.itemName,
        itemIconUrl: validatedData.itemIconUrl,
        itemCategory: validatedData.itemCategory,
      })
      .returning();

    return NextResponse.json({
      success: true,
      favorite: newFavorite[0],
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.message },
        { status: 400 }
      );
    }

    return safeErrorResponse(error, 'Failed to add favorite');
  }
}
