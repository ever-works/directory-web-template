import { NextRequest, NextResponse } from "next/server";
import { categoryRepository } from "@/lib/repositories/category.repository";
import { auth } from "@/lib/auth";
import { invalidateContentCaches } from "@/lib/cache-invalidation";
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/admin/categories/reorder:
 *   put:
 *     tags: ["Admin - Categories"]
 *     summary: "Reorder categories"
 *     description: "Reorders categories based on provided array of category IDs. The order in the array determines the new display order. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Array of category IDs in the desired order"
 *                 example: ["productivity", "design", "development", "marketing"]
 *                 minItems: 1
 *             required: ["categoryIds"]
 *     responses:
 *       200:
 *         description: "Categories reordered successfully"
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
 *                   example: "Categories reordered successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Categories reordered successfully"
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
 *                   examples:
 *                     not_array: "categoryIds must be an array"
 *                     empty_array: "categoryIds array cannot be empty"
 *                     invalid_ids: "All category IDs must be strings"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
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
 *                   example: "Failed to reorder categories"
 */
export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { categoryIds } = body;

    // Validate input
    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { success: false, error: "categoryIds must be an array" },
        { status: 400 }
      );
    }

    if (categoryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "categoryIds array cannot be empty" },
        { status: 400 }
      );
    }

    // Check if all IDs are strings
    const invalidIds = categoryIds.filter(id => typeof id !== 'string');
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, error: "All category IDs must be strings" },
        { status: 400 }
      );
    }

    // Reorder categories
    await categoryRepository.reorder(categoryIds);

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({
      success: true,
      message: "Categories reordered successfully",
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to reorder categories');
  }
} 