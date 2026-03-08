import { NextRequest, NextResponse } from 'next/server';
import { requireClientAuth, serverErrorResponse, badRequestResponse } from '@/lib/utils/client-auth';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';
import { clientItemsListQuerySchema, clientCreateItemSchema } from '@/lib/validations/client-item';
import { ClientCreateItemResponse } from '@/lib/types/client-item';

/**
 * @swagger
 * /api/client/items:
 *   get:
 *     tags: ["Client - Items"]
 *     summary: "Get user's items list"
 *     description: "Returns a paginated list of items submitted by the authenticated user with optional filtering by status and search."
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
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: "Number of items per page"
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["all", "pending", "approved", "rejected"]
 *         description: "Filter by item status"
 *       - name: "search"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Search by item name or description"
 *     responses:
 *       200:
 *         description: "Items list retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     approved:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                     deleted:
 *                       type: integer
 *       401:
 *         description: "Unauthorized - Authentication required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest) {
  try {
    // Check client authentication
    const authResult = await requireClientAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = clientItemsListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return badRequestResponse(errorMessage);
    }

    const { page, limit, status, search, sortBy, sortOrder, deleted } = validationResult.data;

    // Get client item repository
    const clientItemRepository = getClientItemRepository();

    // Fetch items for user (deleted items or active items)
    const result = deleted
      ? await clientItemRepository.findDeletedByUser(userId, {
          page,
          limit,
          sortBy,
          sortOrder,
        })
      : await clientItemRepository.findByUserPaginated(userId, {
          page,
          limit,
          status,
          search,
          sortBy,
          sortOrder,
        });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      stats: result.stats,
    });

  } catch (error) {
    return serverErrorResponse(error, 'Failed to fetch items');
  }
}

/**
 * @swagger
 * /api/client/items:
 *   post:
 *     tags: ["Client - Items"]
 *     summary: "Create a new item submission"
 *     description: "Creates a new item submission for the authenticated user. The item will be set to 'pending' status for admin review."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "Item name (3-100 characters)"
 *               description:
 *                 type: string
 *                 description: "Item description (10-500 characters)"
 *               source_url:
 *                 type: string
 *                 format: uri
 *                 description: "Main URL/link for the item"
 *               category:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: "Item category or categories"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Item tags"
 *               icon_url:
 *                 type: string
 *                 format: uri
 *                 description: "URL to item icon"
 *             required: ["name", "description", "source_url"]
 *     responses:
 *       201:
 *         description: "Item created successfully"
 *       400:
 *         description: "Bad request - Invalid input"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
  try {
    // Check client authentication
    const authResult = await requireClientAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = clientCreateItemSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((issue) => issue.message)
        .join(', ');
      return badRequestResponse(errorMessage);
    }

    const createData = validationResult.data;

    // Get client item repository
    const clientItemRepository = getClientItemRepository();

    // Create item as client
    const item = await clientItemRepository.createAsClient(userId, createData);

    const response: ClientCreateItemResponse = {
      success: true,
      item,
      message: 'Item submitted successfully. It will be reviewed by our team before being published.',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return serverErrorResponse(error, 'Failed to create item');
  }
}
