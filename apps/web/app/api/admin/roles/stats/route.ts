import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { RoleRepository } from '@/lib/repositories/role.repository';

const roleRepository = new RoleRepository();

/**
 * @swagger
 * /api/admin/roles/stats:
 *   get:
 *     tags: ["Admin - Roles"]
 *     summary: "Get role statistics"
 *     description: "Returns comprehensive statistics about roles including total count, active/inactive breakdown, and average permissions per role. Provides insights for admin dashboard and role management analytics. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Role statistics retrieved successfully"
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
 *                     total:
 *                       type: integer
 *                       description: "Total number of roles"
 *                       example: 25
 *                     active:
 *                       type: integer
 *                       description: "Number of active roles"
 *                       example: 20
 *                     inactive:
 *                       type: integer
 *                       description: "Number of inactive roles"
 *                       example: 5
 *                     averagePermissions:
 *                       type: number
 *                       description: "Average number of permissions per role (rounded to 1 decimal)"
 *                       example: 4.2
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 total: 25
 *                 active: 20
 *                 inactive: 5
 *                 averagePermissions: 4.2
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
 *                   example: "Failed to fetch role statistics"
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!session.user.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const roles = await roleRepository.findAll();
    
    const total = roles.length;
    const active = roles.filter(role => role.status === 'active').length;
    const inactive = total - active;
    
    // Calculate average permissions per role
    const totalPermissions = roles.reduce((sum, role) => sum + role.permissions.length, 0);
    const averagePermissions = total > 0 ? totalPermissions / total : 0;
    
    const stats = {
      total,
      active,
      inactive,
      averagePermissions: Math.round(averagePermissions * 10) / 10, // Round to 1 decimal place
    };
    
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching role stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch role statistics' },
      { status: 500 }
    );
  }
} 