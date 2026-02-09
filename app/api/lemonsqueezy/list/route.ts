import { auth } from "@/lib/auth";
import { getOrCreateLemonsqueezyProvider } from "@/lib/payment/config/payment-provider-manager";
import { statuses } from "@/lib/payment/lib/providers/lemonsqueezy-provider";
import { safeErrorResponse } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validation schema for query parameters
 */
const queryParamsSchema = z.object({
  status: z.enum(statuses).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
  customerEmail: z.string().email().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  storeId: z.string().optional(),
});

/**
 * @swagger
 * /api/lemonsqueezy/list:
 *   get:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "List user checkouts"
 *     description: "Returns a paginated list of LemonSqueezy checkouts for the authenticated user. Supports filtering by status, date range, and other parameters. Includes comprehensive pagination metadata and request tracking. Users can only view their own checkouts unless they have admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["pending", "completed", "failed", "cancelled", "expired"]
 *         description: "Filter by checkout status"
 *         example: "completed"
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: "Number of checkouts per page"
 *         example: 20
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number"
 *         example: 1
 *       - name: "customerEmail"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: email
 *         description: "Filter by customer email (admin only for other users)"
 *         example: "user@example.com"
 *       - name: "dateFrom"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter checkouts from this date"
 *         example: "2024-01-01T00:00:00.000Z"
 *       - name: "dateTo"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter checkouts until this date"
 *         example: "2024-12-31T23:59:59.999Z"
 *       - name: "storeId"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by LemonSqueezy store ID"
 *         example: "12345"
 *     responses:
 *       200:
 *         description: "Checkouts retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: "Checkout ID"
 *                         example: "checkout_123abc"
 *                       status:
 *                         type: string
 *                         enum: ["pending", "completed", "failed", "cancelled", "expired"]
 *                         example: "completed"
 *                       customerEmail:
 *                         type: string
 *                         format: email
 *                         example: "user@example.com"
 *                       amount:
 *                         type: number
 *                         description: "Amount in cents"
 *                         example: 2999
 *                       currency:
 *                         type: string
 *                         example: "USD"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-20T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-20T10:35:00.000Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: "Total number of checkouts"
 *                       example: 150
 *                     page:
 *                       type: integer
 *                       description: "Current page number"
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       description: "Items per page"
 *                       example: 20
 *                     hasMore:
 *                       type: boolean
 *                       description: "Whether there are more pages"
 *                       example: true
 *                     totalPages:
 *                       type: integer
 *                       description: "Total number of pages"
 *                       example: 8
 *                     currentPage:
 *                       type: integer
 *                       description: "Current page number"
 *                       example: 1
 *                 filters:
 *                   type: object
 *                   description: "Applied filters summary"
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     customerEmail:
 *                       type: string
 *                       example: "user@example.com"
 *                     dateRange:
 *                       type: string
 *                       example: "2024-01-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z"
 *                     appliedFilters:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["status", "customerEmail", "dateFrom", "dateTo"]
 *                 metadata:
 *                   type: object
 *                   description: "Request metadata"
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T10:30:00.000Z"
 *                     requestId:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     userId:
 *                       type: string
 *                       example: "user_123abc"
 *                     userEmail:
 *                       type: string
 *                       example: "user@example.com"
 *                     environment:
 *                       type: string
 *                       example: "production"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *               required: ["success", "data", "pagination", "filters", "metadata"]
 *         headers:
 *           Cache-Control:
 *             description: "Cache control header"
 *             schema:
 *               type: string
 *               example: "private, max-age=300"
 *           X-Request-ID:
 *             description: "Request tracking ID"
 *             schema:
 *               type: string
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: "Bad request - Invalid query parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid query parameters"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: [{"code": "invalid_type", "path": ["limit"], "message": "Expected number, received string"}]
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 *                 code:
 *                   type: string
 *                   example: "AUTH_REQUIRED"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch LemonSqueezy checkouts"
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 code:
 *                   type: string
 *                   enum: ["AUTH_ERROR", "SERVICE_UNAVAILABLE", "INTERNAL_ERROR"]
 *                   example: "INTERNAL_ERROR"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *       503:
 *         description: "Service unavailable - LemonSqueezy service error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch LemonSqueezy checkouts"
 *                 code:
 *                   type: string
 *                   example: "SERVICE_UNAVAILABLE"
 *         headers:
 *           Retry-After:
 *             description: "Seconds to wait before retrying"
 *             schema:
 *               type: string
 *               example: "30"
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }, 
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = queryParamsSchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { 
      status, 
      limit, 
      page, 
      customerEmail, 
      dateFrom, 
      dateTo, 
      storeId 
    } = validationResult.data;

    const validationErrors: string[] = [];

    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (fromDate > toDate) {
        validationErrors.push('dateFrom cannot be after dateTo');
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationErrors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // 4. Initialize LemonSqueezy provider
    const lemonsqueezy = getOrCreateLemonsqueezyProvider();

    const filterOptions = {
      status,
      limit,
      page,
      customerEmail: customerEmail || session.user.email, 
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      storeId,
    };

    const result = await lemonsqueezy.listCheckouts(filterOptions);

    const response = {
      success: true,
      data: result.checkouts,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        totalPages: Math.ceil(result.total / result.limit),
        currentPage: result.page,
      },
      filters: {
        status: status || 'all',
        customerEmail: customerEmail || session.user.email,
        dateRange: dateFrom && dateTo 
          ? `${dateFrom} to ${dateTo}`
          : 'all',
        appliedFilters: Object.keys(filterOptions).filter(key => 
          filterOptions[key as keyof typeof filterOptions] !== undefined
        ),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email,
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes cache
        'X-Request-ID': response.metadata.requestId,
      }
    });

  } catch (error) {
    const errorDetail = error instanceof Error ? error.message : 'Unknown error';
    const isNetworkError = errorDetail.includes('fetch') || errorDetail.includes('network');
    const isAuthError = errorDetail.includes('unauthorized') || errorDetail.includes('forbidden');

    const statusCode = isAuthError ? 401 : isNetworkError ? 503 : 500;

    return safeErrorResponse(error, 'Failed to fetch LemonSqueezy checkouts', statusCode);
  }
}

/**
 * @swagger
 * /api/lemonsqueezy/list:
 *   post:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "List checkouts with advanced filtering"
 *     description: "Returns a paginated list of LemonSqueezy checkouts using POST method for complex filtering. Supports the same parameters as GET but via request body. Includes admin access control for viewing other users' checkouts."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["pending", "completed", "failed", "cancelled", "expired"]
 *                 description: "Filter by checkout status"
 *                 example: "completed"
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 50
 *                 description: "Number of checkouts per page"
 *                 example: 20
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: "Page number"
 *                 example: 1
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 description: "Filter by customer email (admin only for other users)"
 *                 example: "user@example.com"
 *               dateFrom:
 *                 type: string
 *                 format: date-time
 *                 description: "Filter checkouts from this date"
 *                 example: "2024-01-01T00:00:00.000Z"
 *               dateTo:
 *                 type: string
 *                 format: date-time
 *                 description: "Filter checkouts until this date"
 *                 example: "2024-12-31T23:59:59.999Z"
 *               storeId:
 *                 type: string
 *                 description: "Filter by LemonSqueezy store ID"
 *                 example: "12345"
 *     responses:
 *       200:
 *         description: "Checkouts retrieved successfully (same structure as GET)"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CheckoutListResponse"
 *       400:
 *         description: "Bad request - Invalid request body or parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     invalid_body: "Invalid request body"
 *                     validation_error: "Invalid request parameters"
 *                 message:
 *                   type: string
 *                   example: "Request body must be a valid JSON object"
 *                 code:
 *                   type: string
 *                   enum: ["INVALID_BODY", "VALIDATION_ERROR"]
 *                   example: "INVALID_BODY"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 *                 code:
 *                   type: string
 *                   example: "AUTH_REQUIRED"
 *       403:
 *         description: "Forbidden - Cannot access other users' checkouts"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden"
 *                 message:
 *                   type: string
 *                   example: "You can only view your own checkouts"
 *                 code:
 *                   type: string
 *                   example: "ACCESS_DENIED"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch LemonSqueezy checkouts"
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 code:
 *                   type: string
 *                   example: "INTERNAL_ERROR"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-20T10:30:00.000Z"
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }, 
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          message: 'Request body must be a valid JSON object',
          code: 'INVALID_BODY'
        },
        { status: 400 }
      );
    }

    const validationResult = queryParamsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validationResult.error.issues,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { 
      status, 
      limit, 
      page, 
      customerEmail, 
      dateFrom, 
      dateTo, 
      storeId 
    } = validationResult.data;

    if (customerEmail && customerEmail !== session.user.email) {
      const isAdmin = session.user.isAdmin;
      
      if (!isAdmin) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: 'You can only view your own checkouts',
            code: 'ACCESS_DENIED'
          },
          { status: 403 }
        );
      }
    }

    // 4. Initialize provider and fetch data
    const lemonsqueezy = getOrCreateLemonsqueezyProvider();

    const filterOptions = {
      status,
      limit,
      page,
      customerEmail: customerEmail || session.user.email,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      storeId,
    };

    const result = await lemonsqueezy.listCheckouts(filterOptions);

    // 5. Prepare response
    const response = {
      success: true,
      data: result.checkouts,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        totalPages: Math.ceil(result.total / result.limit),
        currentPage: result.page,
      },
      filters: {
        status: status || 'all',
        customerEmail: customerEmail || session.user.email,
        dateRange: dateFrom && dateTo 
          ? `${dateFrom} to ${dateTo}`
          : 'all',
        appliedFilters: Object.keys(filterOptions).filter(key => 
          filterOptions[key as keyof typeof filterOptions] !== undefined
        ),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email,
        method: 'POST',
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Request-ID': response.metadata.requestId,
      }
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch LemonSqueezy checkouts');
  }
}