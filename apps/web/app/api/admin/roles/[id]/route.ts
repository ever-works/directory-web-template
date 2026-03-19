import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { RoleRepository } from '@/lib/repositories/role.repository';
import type { UpdateRoleRequest } from '@/lib/types/role';

const roleRepository = new RoleRepository();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   get:
 *     tags: ["Admin - Roles"]
 *     summary: "Get role by ID"
 *     description: "Retrieves a specific role by its ID with complete details including permissions, status, and metadata. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Role ID"
 *         example: "admin"
 *     responses:
 *       200:
 *         description: "Role retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Role"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "admin"
 *                 name: "Administrator"
 *                 description: "Full system administrator with all permissions"
 *                 status: "active"
 *                 isAdmin: true
 *                 permissions: ["users.read", "users.write", "roles.read", "roles.write", "items.read", "items.write"]
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T10:30:00.000Z"
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
 *       404:
 *         description: "Role not found"
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
 *                   example: "Role not found"
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
 *                   example: "Failed to fetch role"
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const role = await roleRepository.findById(id);

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   put:
 *     tags: ["Admin - Roles"]
 *     summary: "Update role"
 *     description: "Updates a specific role's properties including name, description, status, and admin privileges. All fields are optional and only provided fields will be updated. Includes comprehensive validation for name and description lengths. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Role ID to update"
 *         example: "moderator"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: "Role name"
 *                 example: "Senior Moderator"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: "Role description"
 *                 example: "Senior content moderator with enhanced permissions and team leadership responsibilities"
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive"]
 *                 description: "Role status"
 *                 example: "active"
 *               isAdmin:
 *                 type: boolean
 *                 description: "Whether this role has admin privileges"
 *                 example: false
 *     responses:
 *       200:
 *         description: "Role updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Role"
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Role updated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "moderator"
 *                 name: "Senior Moderator"
 *                 description: "Senior content moderator with enhanced permissions and team leadership responsibilities"
 *                 status: "active"
 *                 isAdmin: false
 *                 permissions: ["items.read", "items.moderate", "comments.moderate", "users.moderate"]
 *                 created_at: "2024-01-19T15:20:00.000Z"
 *                 updated_at: "2024-01-20T16:45:00.000Z"
 *               message: "Role updated successfully"
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
 *                     empty_name: "Role name cannot be empty"
 *                     invalid_name_length: "Role name must be between 3 and 100 characters"
 *                     invalid_description_length: "Role description must be at most 500 characters"
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
 *       404:
 *         description: "Role not found"
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
 *                   example: "Role not found"
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
 *                   example: "Failed to update role"
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const updateData: Partial<UpdateRoleRequest> = body;

    // Check if role exists
    const existingRole = await roleRepository.findById(id);
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (updateData.name !== undefined) {
      if (!updateData.name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Role name cannot be empty' },
          { status: 400 }
        );
      }
      if (updateData.name.length < 3 || updateData.name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Role name must be between 3 and 100 characters' },
          { status: 400 }
        );
      }
    }

    // Validate description if provided
    if (updateData.description !== undefined) {
      if (updateData.description.length > 500) {
        return NextResponse.json(
          { success: false, error: 'Role description must be at most 500 characters' },
          { status: 400 }
        );
      }
    }

    // Convert hook type to repository type (excluding permissions due to type mismatch)
    const repositoryUpdateData: UpdateRoleRequest = {
      id,
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.isAdmin !== undefined && { isAdmin: updateData.isAdmin }),
    };

    // Update the role using repository
    const updatedRole = await roleRepository.update(id, repositoryUpdateData);

    return NextResponse.json(
      { success: true, data: updatedRole, message: 'Role updated successfully' }
    );
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   delete:
 *     tags: ["Admin - Roles"]
 *     summary: "Delete role"
 *     description: "Deletes a specific role from the system. Supports both soft delete (default - marks as inactive) and hard delete (permanent removal). Hard delete completely removes the role and all associated data. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Role ID to delete"
 *         example: "old-role"
 *       - name: "hard"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           default: "false"
 *         description: "Whether to perform hard delete (permanent) or soft delete (mark inactive)"
 *         example: "false"
 *     responses:
 *       200:
 *         description: "Role deleted successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: "Success message indicating deletion type"
 *                   examples:
 *                     soft_delete: "Role deleted (marked as inactive)"
 *                     hard_delete: "Role permanently deleted"
 *               required: ["success", "message"]
 *             examples:
 *               soft_delete:
 *                 summary: "Soft delete response"
 *                 value:
 *                   success: true
 *                   message: "Role deleted (marked as inactive)"
 *               hard_delete:
 *                 summary: "Hard delete response"
 *                 value:
 *                   success: true
 *                   message: "Role permanently deleted"
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
 *       404:
 *         description: "Role not found"
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
 *                   example: "Role not found"
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
 *                   example: "Failed to delete role"
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Check if role exists
    const existingRole = await roleRepository.findById(id);
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      await roleRepository.hardDelete(id);
      return NextResponse.json(
        { success: true, message: 'Role permanently deleted' }
      );
    } else {
      await roleRepository.delete(id);
      return NextResponse.json(
        { success: true, message: 'Role deleted (marked as inactive)' }
      );
    }
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete role' },
      { status: 500 }
    );
  }
} 