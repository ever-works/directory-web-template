import { NextRequest, NextResponse } from "next/server";
import { categoryRepository } from "@/lib/repositories/category.repository";
import { UpdateCategoryRequest } from "@/lib/types/category";
import { auth } from "@/lib/auth";
import { invalidateContentCaches } from "@/lib/cache-invalidation";
import { safeErrorResponse } from '@/lib/utils/api-error';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     tags: ["Admin - Categories"]
 *     summary: "Get category by ID"
 *     description: "Retrieves a specific category by its ID. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Category ID"
 *         example: "productivity"
 *     responses:
 *       200:
 *         description: "Category retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Category"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "productivity"
 *                 name: "Productivity"
 *                 isActive: true
 *                 itemCount: 15
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 updatedAt: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: "Unauthorized - Admin access required"
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
 *                   example: "Unauthorized. Admin access required."
 *       404:
 *         description: "Category not found"
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
 *                   example: "Category not found"
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
 *                   example: "Failed to fetch category"
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find category
    const category = await categoryRepository.findById(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch category');
  }
}

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     tags: ["Admin - Categories"]
 *     summary: "Update category"
 *     description: "Updates a specific category by ID. Only the name can be updated. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Category ID"
 *         example: "productivity"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "New category name"
 *                 example: "Productivity Tools"
 *                 minLength: 2
 *                 maxLength: 100
 *             required: ["name"]
 *     responses:
 *       200:
 *         description: "Category updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Category"
 *                 message:
 *                   type: string
 *                   example: "Category updated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "productivity"
 *                 name: "Productivity Tools"
 *                 isActive: true
 *                 itemCount: 15
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T14:45:00.000Z"
 *               message: "Category updated successfully"
 *       400:
 *         description: "Bad request - Validation error"
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
 *                   example: "Category name must be at least 2 characters"
 *       401:
 *         description: "Unauthorized - Admin access required"
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
 *                   example: "Unauthorized. Admin access required."
 *       404:
 *         description: "Category not found"
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
 *                   example: "Category not found"
 *       409:
 *         description: "Conflict - Category name already exists"
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
 *                   example: "Category with this name already exists"
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
 *                   example: "Failed to update category"
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const updateData: UpdateCategoryRequest = {
      id,
      name: body.name,
    };

    // Update category
    const updatedCategory = await categoryRepository.update(updateData);

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: "Category updated successfully",
    });

  } catch (error) {
    console.error('Failed to update category:', error);
    
    // Handle not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }
    
    if (error instanceof Error && error.message.includes('must be')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 } // Bad Request
      );
    }

    return safeErrorResponse(error, 'Failed to update category');
  }
}

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     tags: ["Admin - Categories"]
 *     summary: "Delete category"
 *     description: "Deletes a specific category by ID. By default performs soft delete (deactivation). Use 'hard=true' query parameter for permanent deletion. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Category ID"
 *         example: "productivity"
 *       - name: "hard"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: "Perform hard delete (permanent) instead of soft delete"
 *         example: "false"
 *     responses:
 *       200:
 *         description: "Category deleted successfully"
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
 *                   examples:
 *                     soft_delete: "Category deactivated successfully"
 *                     hard_delete: "Category permanently deleted"
 *               required: ["success", "message"]
 *       401:
 *         description: "Unauthorized - Admin access required"
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
 *                   example: "Unauthorized. Admin access required."
 *       404:
 *         description: "Category not found"
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
 *                   example: "Category not found"
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
 *                   example: "Failed to delete category"
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check for hard delete parameter
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Delete category
    if (hardDelete) {
      await categoryRepository.hardDelete(id);
    } else {
      await categoryRepository.delete(id);
    }

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? "Category permanently deleted"
        : "Category deactivated successfully",
    });

  } catch (error) {
    console.error('Failed to delete category:', error);
    
    // Handle not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return safeErrorResponse(error, 'Failed to delete category');
  }
} 