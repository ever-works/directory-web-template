import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tagRepository } from '@/lib/repositories/tag.repository';
import { UpdateTagRequest } from '@/lib/types/tag';
import { invalidateContentCaches } from '@/lib/cache-invalidation';

/**
 * @swagger
 * /api/admin/tags/{id}:
 *   get:
 *     tags: ["Admin - Tags"]
 *     summary: "Get tag by ID"
 *     description: "Retrieves a specific tag by its ID with complete details including usage statistics and metadata. Used for tag editing and detailed view in admin interfaces. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Tag ID"
 *         example: "productivity"
 *     responses:
 *       200:
 *         description: "Tag retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Tag"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "productivity"
 *                 name: "Productivity"
 *                 isActive: true
 *                 itemCount: 156
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T10:30:00.000Z"
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Tag not found"
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
 *                   example: "Tag not found"
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
 *                   example: "Failed to fetch tag"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tag = await tagRepository.findById(id);
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/tags/{id}:
 *   put:
 *     tags: ["Admin - Tags"]
 *     summary: "Update tag"
 *     description: "Updates a specific tag's properties including name and active status. Used for tag management and maintenance. The tag ID cannot be changed after creation. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Tag ID to update"
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
 *                 description: "Updated tag name"
 *                 example: "Productivity & Efficiency"
 *               isActive:
 *                 type: boolean
 *                 description: "Whether the tag is active and can be used"
 *                 example: true
 *             required: ["name"]
 *     responses:
 *       200:
 *         description: "Tag updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Tag"
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Tag updated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "productivity"
 *                 name: "Productivity & Efficiency"
 *                 isActive: true
 *                 itemCount: 156
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T16:45:00.000Z"
 *               message: "Tag updated successfully"
 *       400:
 *         description: "Bad request - Invalid input or validation errors"
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
 *                     missing_name: "Tag name is required"
 *                     validation_error: "Tag name must be between 2 and 50 characters"
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Tag not found"
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
 *                   example: "Tag not found"
 *       409:
 *         description: "Conflict - Tag name already exists"
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
 *                   example: "Tag with name 'Productivity & Efficiency' already exists"
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
 *                   example: "Failed to update tag"
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, isActive }: UpdateTagRequest = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 }
      );
    }

    const updateData: UpdateTagRequest = {
      name,
      isActive,
    };

    const tag = await tagRepository.update(id, updateData);

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({ success: true, data: tag, message: 'Tag updated successfully' });
  } catch (error) {
    console.error('Error updating tag:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('required') || error.message.includes('must be')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/tags/{id}:
 *   delete:
 *     tags: ["Admin - Tags"]
 *     summary: "Delete tag"
 *     description: "Permanently deletes a specific tag from the system. This action will also remove the tag from all associated items. Use with caution as this operation cannot be undone. Consider deactivating the tag instead if you want to preserve data integrity. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Tag ID to delete"
 *         example: "deprecated-tag"
 *     responses:
 *       200:
 *         description: "Tag deleted successfully"
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
 *                   example: "Tag deleted successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Tag deleted successfully"
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Tag not found"
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
 *                   example: "Tag not found"
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
 *                   example: "Failed to delete tag"
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await tagRepository.delete(id);

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
} 