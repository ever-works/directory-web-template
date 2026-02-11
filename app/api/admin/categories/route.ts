import { NextRequest, NextResponse } from "next/server";
import { categoryRepository } from "@/lib/repositories/category.repository";
import { CreateCategoryRequest, CategoryListOptions } from "@/lib/types/category";
import { auth } from "@/lib/auth";
import { validatePaginationParams } from "@/lib/utils/pagination-validation";
import { invalidateContentCaches } from "@/lib/cache-invalidation";
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     tags: ["Admin - Categories"]
 *     summary: "List categories"
 *     description: "Returns a paginated list of categories with optional filtering and sorting. Supports including inactive categories and custom sorting options. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "includeInactive"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: "Include inactive categories in the results"
 *         example: "false"
 *       - name: "sortBy"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["name", "id"]
 *           default: "name"
 *         description: "Field to sort by"
 *         example: "name"
 *       - name: "sortOrder"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "asc"
 *         description: "Sort order"
 *         example: "asc"
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
 *         description: "Number of categories per page"
 *         example: 10
 *     responses:
 *       200:
 *         description: "Categories retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Category"
 *                 total:
 *                   type: integer
 *                   description: "Total number of categories"
 *                   example: 25
 *                 page:
 *                   type: integer
 *                   description: "Current page number"
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: "Number of items per page"
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   description: "Total number of pages"
 *                   example: 3
 *               required: ["success", "categories", "total", "page", "limit", "totalPages"]
 *             example:
 *               success: true
 *               categories:
 *                 - id: "productivity"
 *                   name: "Productivity"
 *                   isActive: true
 *                   itemCount: 15
 *                   createdAt: "2024-01-15T10:30:00.000Z"
 *                   updatedAt: "2024-01-15T10:30:00.000Z"
 *                 - id: "design"
 *                   name: "Design"
 *                   isActive: true
 *                   itemCount: 8
 *                   createdAt: "2024-01-16T11:20:00.000Z"
 *                   updatedAt: "2024-01-16T11:20:00.000Z"
 *                 - id: "development"
 *                   name: "Development"
 *                   isActive: true
 *                   itemCount: 12
 *                   createdAt: "2024-01-17T09:15:00.000Z"
 *                   updatedAt: "2024-01-17T09:15:00.000Z"
 *               total: 25
 *               page: 1
 *               limit: 10
 *               totalPages: 3
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
 *                   example: "Failed to fetch categories"
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Validate pagination parameters
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error },
        { status: paginationResult.status }
      );
    }
    const { page, limit } = paginationResult;

    const includeInactive = searchParams.get('includeInactive') === 'true';
    const sortByParam = searchParams.get('sortBy');
    const sortBy = (sortByParam === 'name' || sortByParam === 'id') ? sortByParam : 'name';
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder = (sortOrderParam === 'asc' || sortOrderParam === 'desc') ? sortOrderParam : 'asc';

    const options: CategoryListOptions = {
      includeInactive,
      sortBy,
      sortOrder,
      page,
      limit,
    };

    // Get categories with pagination
    const result = await categoryRepository.findAllPaginated(options);

    return NextResponse.json({
      success: true,
      categories: result.categories,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch categories');
  }
}

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     tags: ["Admin - Categories"]
 *     summary: "Create category"
 *     description: "Creates a new category with the specified ID and name. The ID is optional and will be auto-generated if not provided. Prevents duplicate category creation. Requires admin privileges."
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
 *                 description: "Unique category identifier (optional, auto-generated if not provided)"
 *                 example: "productivity"
 *                 pattern: "^[a-z0-9-]+$"
 *               name:
 *                 type: string
 *                 description: "Category display name"
 *                 example: "Productivity"
 *                 minLength: 2
 *                 maxLength: 100
 *             required: ["name"]
 *     responses:
 *       201:
 *         description: "Category created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: "#/components/schemas/Category"
 *                 message:
 *                   type: string
 *                   example: "Category created successfully"
 *               required: ["success", "category", "message"]
 *             example:
 *               success: true
 *               category:
 *                 id: "productivity"
 *                 name: "Productivity"
 *                 isActive: true
 *                 itemCount: 0
 *                 createdAt: "2024-01-20T15:30:00.000Z"
 *                 updatedAt: "2024-01-20T15:30:00.000Z"
 *               message: "Category created successfully"
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
 *                   examples:
 *                     missing_name: "Category name is required"
 *                     invalid_format: "Category name must be at least 2 characters"
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
 *       409:
 *         description: "Conflict - Category already exists"
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
 *                   example: "Failed to create category"
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const createData: CreateCategoryRequest = {
      id: body.id,
      name: body.name,
    };

    // Validate required fields
    if (!createData.name) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 }
      );
    }

    // Create category
    const newCategory = await categoryRepository.create(createData);

    // Invalidate content caches to ensure immediate visibility
    await invalidateContentCaches();

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: "Category created successfully",
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create category:', error);
    
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

    return safeErrorResponse(error, 'Failed to create category');
  }
} 