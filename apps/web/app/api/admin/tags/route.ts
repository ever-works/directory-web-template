import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tagRepository } from '@/lib/repositories/tag.repository';
import { CreateTagRequest } from '@/lib/types/tag';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import { invalidateContentCaches } from '@/lib/cache-invalidation';

/**
 * @swagger
 * /api/admin/tags:
 *   get:
 *     tags: ["Admin - Tags"]
 *     summary: "Get paginated tags list"
 *     description: "Returns a paginated list of all tags in the system. Used for tag management in admin interfaces. Includes pagination metadata and supports flexible page sizing. Requires admin privileges."
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
 *         description: "Number of tags per page"
 *         example: 10
 *     responses:
 *       200:
 *         description: "Tags list retrieved successfully"
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
 *                     tags:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Tag"
 *                     total:
 *                       type: integer
 *                       description: "Total number of tags"
 *                       example: 45
 *                     page:
 *                       type: integer
 *                       description: "Current page number"
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       description: "Number of tags per page"
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       description: "Total number of pages"
 *                       example: 5
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 tags:
 *                   - id: "productivity"
 *                     name: "Productivity"
 *                     isActive: true
 *                     itemCount: 156
 *                     created_at: "2024-01-20T10:30:00.000Z"
 *                     updated_at: "2024-01-20T10:30:00.000Z"
 *                   - id: "design"
 *                     name: "Design"
 *                     isActive: true
 *                     itemCount: 89
 *                     created_at: "2024-01-19T15:20:00.000Z"
 *                     updated_at: "2024-01-19T15:20:00.000Z"
 *                   - id: "development"
 *                     name: "Development"
 *                     isActive: false
 *                     itemCount: 234
 *                     created_at: "2024-01-18T09:15:00.000Z"
 *                     updated_at: "2024-01-20T14:30:00.000Z"
 *                 total: 45
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 5
 *       400:
 *         description: "Bad request - Invalid pagination parameters"
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
 *             examples:
 *               invalid_page:
 *                 value:
 *                   success: false
 *                   error: "Invalid page parameter. Must be a positive integer."
 *               invalid_limit:
 *                 value:
 *                   success: false
 *                   error: "Invalid limit parameter. Must be between 1 and 100."
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
 *                   example: "Failed to fetch tags"
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams} = new URL(request.url);

    // Validate pagination parameters
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error },
        { status: paginationResult.status }
      );
    }
    const { page, limit } = paginationResult;

    const result = await tagRepository.findAllPaginated(page, limit);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/tags:
 *   post:
 *     tags: ["Admin - Tags"]
 *     summary: "Create new tag"
 *     description: "Creates a new tag with specified ID and name. The tag can be set as active or inactive. Used for expanding the tag taxonomy and organizing content. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Unique tag identifier (URL-friendly slug)"
 *                 example: "artificial-intelligence"
 *               name:
 *                 type: string
 *                 description: "Human-readable tag name"
 *                 example: "Artificial Intelligence"
 *               isActive:
 *                 type: boolean
 *                 description: "Whether the tag is active and can be used"
 *                 default: true
 *                 example: true
 *             required: ["id", "name"]
 *     responses:
 *       201:
 *         description: "Tag created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tag:
 *                   $ref: "#/components/schemas/Tag"
 *               required: ["success", "tag"]
 *             example:
 *               success: true
 *               tag:
 *                 id: "artificial-intelligence"
 *                 name: "Artificial Intelligence"
 *                 isActive: true
 *                 itemCount: 0
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T10:30:00.000Z"
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
 *                     missing_fields: "Tag ID and name are required"
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
 *       409:
 *         description: "Conflict - Tag with same ID or name already exists"
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
 *                   example: "Tag with ID 'artificial-intelligence' already exists"
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
 *                   example: "Failed to create tag"
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, isActive }: CreateTagRequest = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "Tag ID and name are required" },
        { status: 400 }
      );
    }

    const tag = await tagRepository.create({ id, name, isActive: isActive ?? true });

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    
    if (error instanceof Error) {
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
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    );
  }
} 