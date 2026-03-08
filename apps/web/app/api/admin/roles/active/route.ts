import { NextResponse } from 'next/server';
import { RoleRepository } from '@/lib/repositories/role.repository';

const roleRepository = new RoleRepository();

/**
 * @swagger
 * /api/admin/roles/active:
 *   get:
 *     tags: ["Admin - Roles"]
 *     summary: "Get active roles"
 *     description: "Returns a list of all active roles in the system. This endpoint is typically used for role selection in user management interfaces, dropdowns, and assignment forms. Only returns roles with 'active' status."
 *     responses:
 *       200:
 *         description: "Active roles retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Role"
 *               required: ["roles"]
 *             example:
 *               roles:
 *                 - id: "admin"
 *                   name: "Administrator"
 *                   description: "Full system administrator with all permissions"
 *                   status: "active"
 *                   isAdmin: true
 *                   permissions: ["users.read", "users.write", "roles.read", "roles.write"]
 *                   created_at: "2024-01-20T10:30:00.000Z"
 *                   updated_at: "2024-01-20T10:30:00.000Z"
 *                 - id: "moderator"
 *                   name: "Moderator"
 *                   description: "Content moderator with limited admin permissions"
 *                   status: "active"
 *                   isAdmin: false
 *                   permissions: ["items.read", "items.moderate", "comments.moderate"]
 *                   created_at: "2024-01-19T15:20:00.000Z"
 *                   updated_at: "2024-01-19T15:20:00.000Z"
 *                 - id: "user"
 *                   name: "Regular User"
 *                   description: "Standard user with basic permissions"
 *                   status: "active"
 *                   isAdmin: false
 *                   permissions: ["items.read", "comments.read", "comments.write"]
 *                   created_at: "2024-01-18T09:15:00.000Z"
 *                   updated_at: "2024-01-18T09:15:00.000Z"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch active roles"
 */
export async function GET() {
  try {
    const activeRoles = await roleRepository.findActive();

    return NextResponse.json({
      roles: activeRoles,
    });
  } catch (error) {
    console.error('Error fetching active roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active roles' },
      { status: 500 }
    );
  }
}