import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEnhancedClientStats } from '@/lib/db/queries';

/**
 * @swagger
 * /api/admin/clients/stats:
 *   get:
 *     tags: ["Admin - Clients"]
 *     summary: "Get enhanced client statistics"
 *     description: "Returns comprehensive client statistics including totals, distributions, trends, and analytics. Provides detailed insights for admin dashboard and reporting. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Client statistics retrieved successfully"
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
 *                     overview:
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
 *                         inactiveClients:
 *                           type: integer
 *                           description: "Number of inactive clients"
 *                           example: 67
 *                         suspendedClients:
 *                           type: integer
 *                           description: "Number of suspended clients"
 *                           example: 24
 *                         trialClients:
 *                           type: integer
 *                           description: "Number of trial clients"
 *                           example: 89
 *                     growth:
 *                       type: object
 *                       properties:
 *                         newClientsToday:
 *                           type: integer
 *                           description: "New clients registered today"
 *                           example: 3
 *                         newClientsThisWeek:
 *                           type: integer
 *                           description: "New clients registered this week"
 *                           example: 18
 *                         newClientsThisMonth:
 *                           type: integer
 *                           description: "New clients registered this month"
 *                           example: 45
 *                         growthRate:
 *                           type: number
 *                           description: "Monthly growth rate percentage"
 *                           example: 3.8
 *                     plans:
 *                       type: object
 *                       properties:
 *                         free:
 *                           type: integer
 *                           description: "Number of free plan clients"
 *                           example: 856
 *                         standard:
 *                           type: integer
 *                           description: "Number of standard plan clients"
 *                           example: 267
 *                         premium:
 *                           type: integer
 *                           description: "Number of premium plan clients"
 *                           example: 124
 *                         conversionRate:
 *                           type: number
 *                           description: "Free to paid conversion rate percentage"
 *                           example: 31.4
 *                     accountTypes:
 *                       type: object
 *                       properties:
 *                         individual:
 *                           type: integer
 *                           description: "Number of individual accounts"
 *                           example: 789
 *                         business:
 *                           type: integer
 *                           description: "Number of business accounts"
 *                           example: 356
 *                         enterprise:
 *                           type: integer
 *                           description: "Number of enterprise accounts"
 *                           example: 102
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         averageSubmissions:
 *                           type: number
 *                           description: "Average submissions per client"
 *                           example: 12.5
 *                         totalSubmissions:
 *                           type: integer
 *                           description: "Total submissions across all clients"
 *                           example: 15587
 *                         activeThisWeek:
 *                           type: integer
 *                           description: "Clients active in the last 7 days"
 *                           example: 892
 *                         activeThisMonth:
 *                           type: integer
 *                           description: "Clients active in the last 30 days"
 *                           example: 1034
 *                     demographics:
 *                       type: object
 *                       properties:
 *                         topCountries:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               country:
 *                                 type: string
 *                                 example: "United States"
 *                               count:
 *                                 type: integer
 *                                 example: 456
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
 *                         topIndustries:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               industry:
 *                                 type: string
 *                                 example: "Technology"
 *                               count:
 *                                 type: integer
 *                                 example: 234
 *                     providers:
 *                       type: object
 *                       properties:
 *                         google:
 *                           type: integer
 *                           description: "Clients using Google authentication"
 *                           example: 567
 *                         github:
 *                           type: integer
 *                           description: "Clients using GitHub authentication"
 *                           example: 234
 *                         email:
 *                           type: integer
 *                           description: "Clients using email authentication"
 *                           example: 446
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 overview:
 *                   totalClients: 1247
 *                   activeClients: 1156
 *                   inactiveClients: 67
 *                   suspendedClients: 24
 *                   trialClients: 89
 *                 growth:
 *                   newClientsToday: 3
 *                   newClientsThisWeek: 18
 *                   newClientsThisMonth: 45
 *                   growthRate: 3.8
 *                 plans:
 *                   free: 856
 *                   standard: 267
 *                   premium: 124
 *                   conversionRate: 31.4
 *                 accountTypes:
 *                   individual: 789
 *                   business: 356
 *                   enterprise: 102
 *                 engagement:
 *                   averageSubmissions: 12.5
 *                   totalSubmissions: 15587
 *                   activeThisWeek: 892
 *                   activeThisMonth: 1034
 *                 demographics:
 *                   topCountries:
 *                     - country: "United States"
 *                       count: 456
 *                     - country: "Canada"
 *                       count: 234
 *                   topCompanies:
 *                     - company: "Tech Corp Inc"
 *                       count: 25
 *                     - company: "StartupCo"
 *                       count: 18
 *                   topIndustries:
 *                     - industry: "Technology"
 *                       count: 234
 *                     - industry: "Finance"
 *                       count: 156
 *                 providers:
 *                   google: 567
 *                   github: 234
 *                   email: 446
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
 *       403:
 *         description: "Forbidden - Admin access required"
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
 *                   example: "Forbidden"
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
 *                   example: "Failed to fetch client stats"
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (!session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get comprehensive client statistics
    const stats = await getEnhancedClientStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching client stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch client stats' 
    }, { status: 500 });
  }
}
