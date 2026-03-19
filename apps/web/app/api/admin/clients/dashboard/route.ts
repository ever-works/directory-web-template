import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { getAdminDashboardData } from '@/lib/db/queries';

/**
 * @swagger
 * /api/admin/clients/dashboard:
 *   get:
 *     tags: ["Admin - Clients"]
 *     summary: "Get admin dashboard data"
 *     description: "Returns comprehensive dashboard data including client statistics, recent clients, and filtered client lists. Supports all filtering options from the main clients endpoint plus additional dashboard-specific metrics. Requires admin privileges."
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
 *         description: "Page number for client list pagination"
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
 *         example: 10
 *       - name: "search"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Search term for client name or email"
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
 *       - name: "createdAfter"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter clients created after this date (YYYY-MM-DD)"
 *         example: "2024-01-01"
 *       - name: "createdBefore"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter clients created before this date (YYYY-MM-DD)"
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: "Dashboard data retrieved successfully"
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
 *                       description: "Paginated list of clients"
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalClients:
 *                           type: integer
 *                           description: "Total number of clients"
 *                           example: 1247
 *                         activeClients:
 *                           type: integer
 *                           description: "Number of active clients"
 *                           example: 1156
 *                         newClientsThisMonth:
 *                           type: integer
 *                           description: "New clients registered this month"
 *                           example: 45
 *                         planDistribution:
 *                           type: object
 *                           properties:
 *                             free:
 *                               type: integer
 *                               example: 856
 *                             standard:
 *                               type: integer
 *                               example: 267
 *                             premium:
 *                               type: integer
 *                               example: 124
 *                         accountTypeDistribution:
 *                           type: object
 *                           properties:
 *                             individual:
 *                               type: integer
 *                               example: 789
 *                             business:
 *                               type: integer
 *                               example: 356
 *                             enterprise:
 *                               type: integer
 *                               example: 102
 *                         averageSubmissions:
 *                           type: number
 *                           description: "Average submissions per client"
 *                           example: 12.5
 *                         topCompanies:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               company:
 *                                 type: string
 *                                 example: "Tech Corp Inc"
 *                               count:
 *                                 type: integer
 *                                 example: 25
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 1247
 *                         totalPages:
 *                           type: integer
 *                           example: 125
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
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *                     lastActiveAt: "2024-01-20T14:45:00.000Z"
 *                 stats:
 *                   totalClients: 1247
 *                   activeClients: 1156
 *                   newClientsThisMonth: 45
 *                   planDistribution:
 *                     free: 856
 *                     standard: 267
 *                     premium: 124
 *                   accountTypeDistribution:
 *                     individual: 789
 *                     business: 356
 *                     enterprise: 102
 *                   averageSubmissions: 12.5
 *                   topCompanies:
 *                     - company: "Tech Corp Inc"
 *                       count: 25
 *                     - company: "StartupCo"
 *                       count: 18
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1247
 *                   totalPages: 125
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
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch dashboard data"
 */
export async function GET(request: NextRequest) {
	try {
		console.log('API: Starting dashboard request');

		// Check admin authentication
		const authError = await checkAdminAuth();
		if (authError) {
			return authError;
		}

		const { searchParams } = new URL(request.url);
		console.log('API: Parsed search params');

		// Pagination with validation
		const rawPage = Number(searchParams.get('page') ?? 1);
		const rawLimit = Number(searchParams.get('limit') ?? 10);
		const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), 100) : 10;

		// Parse all search parameters
		const search = searchParams.get('search') || undefined;
		const status = searchParams.get('status') || undefined;
		const plan = searchParams.get('plan') || undefined;
		const accountType = searchParams.get('accountType') || undefined;
		const provider = searchParams.get('provider') || undefined;

		// Date parameters with validation (treat YYYY-MM-DD as UTC date-only)
		const parseDateBound = (v: string | null, bound: 'start' | 'end') => {
			if (!v) return undefined;
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
				const [y, m, d] = v.split('-').map(Number);
				return new Date(
					Date.UTC(
						y,
						m - 1,
						d,
						bound === 'end' ? 23 : 0,
						bound === 'end' ? 59 : 0,
						bound === 'end' ? 59 : 0,
						bound === 'end' ? 999 : 0
					)
				);
			}
			const d = new Date(v);
			return Number.isNaN(d.getTime()) ? undefined : d;
		};
		const createdAfter = parseDateBound(searchParams.get('createdAfter'), 'start');
		const createdBefore = parseDateBound(searchParams.get('createdBefore'), 'end');
		const updatedAfter = parseDateBound(searchParams.get('updatedAfter'), 'start');
		const updatedBefore = parseDateBound(searchParams.get('updatedBefore'), 'end');

		if (process.env.NODE_ENV !== 'production')
			console.log('API: About to build dashboard data with filters:', {
				search,
				status,
				plan,
				accountType,
				provider,
				createdAfter,
				createdBefore,
				updatedAfter,
				updatedBefore
			});

		// Use the existing function that handles all filtering and stats
		const result = await getAdminDashboardData({
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
			updatedBefore
		});

		console.log('API: Dashboard data query completed successfully');

		return NextResponse.json({
			success: true,
			data: {
				clients: result.clients,
				stats: result.stats,
				pagination: result.pagination
			}
		});
	} catch (error) {
		console.error('Error fetching dashboard data:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 });
	}
}
