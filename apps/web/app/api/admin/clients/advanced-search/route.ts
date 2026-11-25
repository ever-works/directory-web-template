import { NextRequest, NextResponse } from 'next/server';
import { advancedClientSearch } from '@/lib/db/queries';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { parsePaginationParams } from '@/lib/utils/pagination-params';
import { MAX_INT32, parseNonNegativeIntParam } from '@/lib/utils/non-negative-int-param';

function invalidSubmissionsParam(name: 'minSubmissions' | 'maxSubmissions') {
  return NextResponse.json(
    { success: false, error: `Invalid ${name} parameter. Must be a whole number between 0 and ${MAX_INT32}.` },
    { status: 400 }
  );
}

/**
 * @swagger
 * /api/admin/clients/advanced-search:
 *   get:
 *     tags: ["Admin - Clients"]
 *     summary: "Advanced client search"
 *     description: "Performs advanced search on client profiles with multiple filters, sorting options, and date ranges. Supports field-specific searches, numeric filters, and boolean filters. Requires admin privileges."
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
 *         description: "Number of clients per page"
 *         example: 20
 *       - name: "search"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "General search term for name, email, or username"
 *         example: "john"
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["active", "inactive", "suspended", "trial"]
 *         description: "Filter by client status"
 *         example: "active"
 *       - name: "plan"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["free", "standard", "premium"]
 *         description: "Filter by subscription plan"
 *         example: "premium"
 *       - name: "accountType"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["individual", "business", "enterprise"]
 *         description: "Filter by account type"
 *         example: "business"
 *       - name: "provider"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by authentication provider"
 *         example: "google"
 *       - name: "sortBy"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["createdAt", "updatedAt", "name", "email", "company", "totalSubmissions"]
 *         description: "Field to sort by"
 *         example: "createdAt"
 *       - name: "sortOrder"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "desc"
 *         description: "Sort order"
 *         example: "desc"
 *       - name: "createdAfter"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter clients created after this date"
 *         example: "2024-01-01T00:00:00.000Z"
 *       - name: "createdBefore"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter clients created before this date"
 *         example: "2024-12-31T23:59:59.000Z"
 *       - name: "emailDomain"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by email domain"
 *         example: "example.com"
 *       - name: "companySearch"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Search in company names"
 *         example: "Tech Corp"
 *       - name: "minSubmissions"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 2147483647
 *         description: "Minimum number of submissions. An empty value is no filter; any other value that is not a whole number from 0 to 2147483647 answers 400."
 *         example: 5
 *       - name: "maxSubmissions"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 2147483647
 *         description: "Maximum number of submissions. An empty value is no filter; any other value that is not a whole number from 0 to 2147483647 answers 400."
 *         example: 100
 *       - name: "emailVerified"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: "Filter by email verification status"
 *         example: "true"
 *       - name: "twoFactorEnabled"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: "Filter by two-factor authentication status"
 *         example: "true"
 *     responses:
 *       200:
 *         description: "Advanced search completed successfully"
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
 *                     clients:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/ClientProfile"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 15
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *                     searchMetadata:
 *                       type: object
 *                       properties:
 *                         appliedFilters:
 *                           type: object
 *                           description: "Summary of applied search filters"
 *                         searchTime:
 *                           type: number
 *                           description: "Search execution time in milliseconds"
 *                           example: 45.2
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 clients:
 *                   - id: "client_123abc"
 *                     displayName: "John Doe"
 *                     username: "johndoe"
 *                     email: "john.doe@example.com"
 *                     company: "Tech Corp Inc"
 *                     status: "active"
 *                     plan: "premium"
 *                     accountType: "business"
 *                     totalSubmissions: 25
 *                     emailVerified: true
 *                     twoFactorEnabled: true
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *                     lastActiveAt: "2024-01-20T14:45:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   total: 15
 *                   totalPages: 1
 *                 searchMetadata:
 *                   appliedFilters:
 *                     status: "active"
 *                     plan: "premium"
 *                     emailVerified: true
 *                   searchTime: 45.2
 *       400:
 *         description: "Bad request - invalid minSubmissions or maxSubmissions"
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
 *                   example: "Invalid minSubmissions parameter. Must be a whole number between 0 and 2147483647."
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                 error:
 *                   type: string
 *                   example: "Failed to perform advanced search"
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Basic parameters with validation
    const { page, limit } = parsePaginationParams(searchParams.get('page'), searchParams.get('limit'), {
      defaultLimit: 10,
      maxLimit: 100
    });
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const plan = searchParams.get('plan') || undefined;
    const accountType = searchParams.get('accountType') || undefined;
    const provider = searchParams.get('provider') || undefined;
    
    // Advanced parameters
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'name' | 'email' | 'company' | 'totalSubmissions' | undefined;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;
    
    // Date parameters with validation
    const parseDate = (v: string | null) => {
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const createdAfter = parseDate(searchParams.get('createdAfter'));
    const createdBefore = parseDate(searchParams.get('createdBefore'));
    const updatedAfter = parseDate(searchParams.get('updatedAfter'));
    const updatedBefore = parseDate(searchParams.get('updatedBefore'));
    
    // Field-specific searches
    const emailDomain = searchParams.get('emailDomain') || undefined;
    const companySearch = searchParams.get('companySearch') || undefined;
    const locationSearch = searchParams.get('locationSearch') || undefined;
    const industrySearch = searchParams.get('industrySearch') || undefined;
    
    // Numeric filters: a missing or empty value is no filter. Anything else must be a whole number
    // in the integer column's range, or the request is a 400 (not a filter on 0, and not a 500).
    const minSubmissions = parseNonNegativeIntParam(searchParams.get('minSubmissions'));
    if (!minSubmissions.ok) return invalidSubmissionsParam('minSubmissions');
    const maxSubmissions = parseNonNegativeIntParam(searchParams.get('maxSubmissions'));
    if (!maxSubmissions.ok) return invalidSubmissionsParam('maxSubmissions');
    
    // Boolean filters
    const hasAvatar = searchParams.get('hasAvatar') ? searchParams.get('hasAvatar') === 'true' : undefined;
    const hasWebsite = searchParams.get('hasWebsite') ? searchParams.get('hasWebsite') === 'true' : undefined;
    const hasPhone = searchParams.get('hasPhone') ? searchParams.get('hasPhone') === 'true' : undefined;
    const emailVerified = searchParams.get('emailVerified') ? searchParams.get('emailVerified') === 'true' : undefined;
    const twoFactorEnabled = searchParams.get('twoFactorEnabled') ? searchParams.get('twoFactorEnabled') === 'true' : undefined;

    const result = await advancedClientSearch({
      page,
      limit,
      search,
      status,
      plan,
      accountType,
      provider,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      emailDomain,
      companySearch,
      locationSearch,
      industrySearch,
      minSubmissions: minSubmissions.value,
      maxSubmissions: maxSubmissions.value,
      hasAvatar,
      hasWebsite,
      hasPhone,
      emailVerified,
      twoFactorEnabled,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: {
        clients: result.clients,
        pagination: result.pagination,
        searchMetadata: result.searchMetadata
      }
    });
  } catch (error) {
    console.error('Error in advanced search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform advanced search' },
      { status: 500 }
    );
  }
}
