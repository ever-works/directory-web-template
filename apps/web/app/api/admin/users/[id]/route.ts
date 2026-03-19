import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRepository } from '@/lib/repositories/user.repository';
import { RoleRepository } from '@/lib/repositories/role.repository';
import { UpdateUserRequest, isValidUserStatus } from '@/lib/types/user';
import { isValidEmail } from '@/lib/utils/email-validation';

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     tags: ["Admin - Users"]
 *     summary: "Get user by ID"
 *     description: "Retrieves a specific user by their ID with complete profile information including role, status, and metadata. Used for user detail views and editing forms in admin interfaces. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "User ID"
 *         example: "user_123abc"
 *     responses:
 *       200:
 *         description: "User retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/User"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "user_123abc"
 *                 username: "johndoe"
 *                 email: "john.doe@example.com"
 *                 name: "John Doe"
 *                 title: "Senior Developer"
 *                 avatar: "https://example.com/avatars/john.jpg"
 *                 role: "admin"
 *                 status: "active"
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T14:45:00.000Z"
 *                 last_login: "2024-01-20T16:20:00.000Z"
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
 *         description: "User not found"
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
 *                   example: "User not found"
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get user
    const userRepository = new UserRepository();
    const user = await userRepository.findById(id);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     tags: ["Admin - Users"]
 *     summary: "Update user"
 *     description: "Updates a specific user's properties with comprehensive validation. All fields are optional and only provided fields will be updated. Includes email format validation, username format validation, role verification, and status validation. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "User ID to update"
 *         example: "user_123abc"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: "Username"
 *                 example: "johndoe_updated"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Email address"
 *                 example: "john.updated@example.com"
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: "Full name"
 *                 example: "John Updated Doe"
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: "Job title or position"
 *                 example: "Lead Developer"
 *               avatar:
 *                 type: string
 *                 maxLength: 500
 *                 format: uri
 *                 description: "Avatar image URL"
 *                 example: "https://example.com/avatars/john_new.jpg"
 *               role:
 *                 type: string
 *                 description: "User role (must exist in system)"
 *                 example: "moderator"
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive"]
 *                 description: "User status"
 *                 example: "active"
 *     responses:
 *       200:
 *         description: "User updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/User"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "user_123abc"
 *                 username: "johndoe_updated"
 *                 email: "john.updated@example.com"
 *                 name: "John Updated Doe"
 *                 title: "Lead Developer"
 *                 avatar: "https://example.com/avatars/john_new.jpg"
 *                 role: "moderator"
 *                 status: "active"
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T16:45:00.000Z"
 *                 last_login: "2024-01-20T16:20:00.000Z"
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
 *                     invalid_email: "Invalid email format"
 *                     invalid_username: "Username must be between 3 and 50 characters"
 *                     invalid_name: "Name must be between 2 and 100 characters"
 *                     invalid_role: "Invalid role"
 *                     invalid_status: "Invalid status. Must be \"active\" or \"inactive\""
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
 *         description: "User not found"
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
 *                   example: "User not found"
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Parse request body
    const body = await request.json();

    // Validate request body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    // Validate email format if provided
    if (body.email !== undefined) {
      if (typeof body.email !== 'string') {
        return NextResponse.json({ success: false, error: 'Email must be a string' }, { status: 400 });
      }
      if (!isValidEmail(body.email)) {
        return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Validate username if provided
    if (body.username !== undefined) {
      if (typeof body.username !== 'string') {
        return NextResponse.json({ success: false, error: 'Username must be a string' }, { status: 400 });
      }
      if (body.username.trim().length < 3 || body.username.trim().length > 50) {
        return NextResponse.json({ success: false, error: 'Username must be between 3 and 50 characters' }, { status: 400 });
      }
    }

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return NextResponse.json({ success: false, error: 'Name must be a string' }, { status: 400 });
      }
      if (body.name.trim().length < 2 || body.name.trim().length > 100) {
        return NextResponse.json({ success: false, error: 'Name must be between 2 and 100 characters' }, { status: 400 });
      }
    }

    // Validate title if provided
    if (body.title !== undefined && body.title !== null) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ success: false, error: 'Title must be a string' }, { status: 400 });
      }
      if (body.title.length > 100) {
        return NextResponse.json({ success: false, error: 'Title must be at most 100 characters' }, { status: 400 });
      }
    }

    // Validate avatar if provided
    if (body.avatar !== undefined && body.avatar !== null) {
      if (typeof body.avatar !== 'string') {
        return NextResponse.json({ success: false, error: 'Avatar must be a string' }, { status: 400 });
      }
      if (body.avatar.length > 500) {
        return NextResponse.json({ success: false, error: 'Avatar URL must be at most 500 characters' }, { status: 400 });
      }
    }

    // Validate role if provided
    if (body.role !== undefined) {
      if (typeof body.role !== 'string') {
        return NextResponse.json({ success: false, error: 'Role must be a string' }, { status: 400 });
      }
      if (body.role.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Role cannot be empty' }, { status: 400 });
      }

      // Check if role exists in the system
      const roleRepository = new RoleRepository();
      const roleExists = await roleRepository.findById(body.role);
      if (!roleExists) {
        return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
      }
    }

    // Validate status if provided
    if (body.status !== undefined) {
      if (!isValidUserStatus(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status. Must be "active" or "inactive"' }, { status: 400 });
      }
    }

    const userData: UpdateUserRequest = {
      username: body.username,
      email: body.email,
      name: body.name,
      title: body.title,
      avatar: body.avatar,
      role: body.role,
      status: body.status,
    };

    // Update user
    const userRepository = new UserRepository();
    const updatedUser = await userRepository.update(id, userData);

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: ["Admin - Users"]
 *     summary: "Delete user"
 *     description: "Permanently deletes a specific user from the system. This action cannot be undone and will remove all user data including profile, activity history, and associated content. Includes protection against self-deletion to prevent admin lockout. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "User ID to delete"
 *         example: "user_456def"
 *     responses:
 *       200:
 *         description: "User deleted successfully"
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
 *                   description: "Success message"
 *                   example: "User deleted successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "User deleted successfully"
 *       400:
 *         description: "Bad request - Cannot delete own account"
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
 *                   example: "Cannot delete your own account"
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
 *         description: "User not found"
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
 *                   example: "User not found"
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user
    const userRepository = new UserRepository();
    await userRepository.delete(id);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 