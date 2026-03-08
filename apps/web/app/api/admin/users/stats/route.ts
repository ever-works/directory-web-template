import { NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repositories/user.repository';
import { checkAdminAuth } from '@/lib/auth/admin-guard';

/**
 * @swagger
 * /api/admin/users/stats:
 *   get:
 *     tags: ["Admin - Users"]
 *     summary: "Get user statistics"
 *     description: "Returns comprehensive statistics about users including total count, active/inactive breakdown, role distribution, recent registrations, and other metrics for admin dashboard and analytics. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "User statistics retrieved successfully"
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
 *                     totalUsers:
 *                       type: integer
 *                       description: "Total number of users"
 *                       example: 1247
 *                     activeUsers:
 *                       type: integer
 *                       description: "Number of active users"
 *                       example: 1156
 *                     inactiveUsers:
 *                       type: integer
 *                       description: "Number of inactive users"
 *                       example: 91
 *                     recentRegistrations:
 *                       type: integer
 *                       description: "Users registered in the last 30 days"
 *                       example: 67
 *                     roleDistribution:
 *                       type: object
 *                       description: "Users count by role"
 *                       additionalProperties:
 *                         type: integer
 *                       example:
 *                         admin: 5
 *                         moderator: 23
 *                         user: 1219
 *                     averageLoginFrequency:
 *                       type: number
 *                       description: "Average logins per user per month"
 *                       example: 12.5
 *                     topActiveUsers:
 *                       type: array
 *                       description: "Most active users (by login frequency)"
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "user_123abc"
 *                           username:
 *                             type: string
 *                             example: "johndoe"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           loginCount:
 *                             type: integer
 *                             example: 45
 *                           lastLogin:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-20T16:20:00.000Z"
 *                       maxItems: 10
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 totalUsers: 1247
 *                 activeUsers: 1156
 *                 inactiveUsers: 91
 *                 recentRegistrations: 67
 *                 roleDistribution:
 *                   admin: 5
 *                   moderator: 23
 *                   user: 1219
 *                 averageLoginFrequency: 12.5
 *                 topActiveUsers:
 *                   - id: "user_123abc"
 *                     username: "johndoe"
 *                     name: "John Doe"
 *                     loginCount: 45
 *                     lastLogin: "2024-01-20T16:20:00.000Z"
 *                   - id: "user_456def"
 *                     username: "janesmith"
 *                     name: "Jane Smith"
 *                     loginCount: 38
 *                     lastLogin: "2024-01-20T15:30:00.000Z"
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
 *                   example: "Internal server error"
 */
export async function GET() {
  try {
    // Check admin authentication
    const authError = await checkAdminAuth();
    if (authError) {
      return authError;
    }

    // Get user statistics
    const userRepository = new UserRepository();
    const stats = await userRepository.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/users/stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 