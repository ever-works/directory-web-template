import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/favorites/{itemSlug}:
 *   delete:
 *     tags: ["Favorites"]
 *     summary: "Remove item from favorites"
 *     description: "Removes a specific item from the authenticated user's favorites list using the item slug. Includes existence checking to ensure the favorite belongs to the current user before deletion. Requires user authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "itemSlug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug identifier to remove from favorites"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Item removed from favorites successfully"
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
 *                   example: "Favorite removed successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Favorite removed successfully"
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
 *         description: "Favorite not found or doesn't belong to user"
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
 *                   example: "Favorite not found"
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
 *                   example: "Failed to remove favorite"
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemSlug: string }> }
) {
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

    const { itemSlug } = await params;

    // Check if favorite exists
    const existingFavorite = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.itemSlug, itemSlug)
        )
      )
      .limit(1);

    if (existingFavorite.length === 0) {
      return NextResponse.json(
        { success: false, error: "Favorite not found" },
        { status: 404 }
      );
    }

    // Delete the favorite
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.itemSlug, itemSlug)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Favorite removed successfully",
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to remove favorite');
  }
}
