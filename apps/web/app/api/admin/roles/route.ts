import { NextRequest, NextResponse } from 'next/server';
import { RoleRepository } from '@/lib/repositories/role.repository';
import type { CreateRoleRequest, RoleStatus } from '@/lib/types/role';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const roleRepository = new RoleRepository();

/**
 * @swagger
 * /api/admin/roles:
 *   get:
 *     tags: ["Admin - Roles"]
 *     summary: "Get paginated roles list"
 *     description: "Returns a paginated list of roles with optional filtering by status and sorting capabilities. Supports comprehensive role management for admin users. Includes pagination metadata and flexible sorting options."
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
 *         description: "Number of roles per page"
 *         example: 10
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["active", "inactive"]
 *         description: "Filter by role status"
 *         example: "active"
 *       - name: "sortBy"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["name", "id", "created_at"]
 *           default: "name"
 *         description: "Field to sort by"
 *         example: "name"
 *       - name: "sortOrder"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "asc"
 *         description: "Sort order"
 *         example: "asc"
 *     responses:
 *       200:
 *         description: "Roles list retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Role"
 *                 total:
 *                   type: integer
 *                   description: "Total number of roles"
 *                   example: 25
 *                 page:
 *                   type: integer
 *                   description: "Current page number"
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: "Number of roles per page"
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   description: "Total number of pages"
 *                   example: 3
 *               required: ["success", "roles", "total", "page", "limit", "totalPages"]
 *             example:
 *               success: true
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
 *               total: 25
 *               page: 1
 *               limit: 10
 *               totalPages: 3
 *       400:
 *         description: "Bad request - Invalid pagination parameters"
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
 *             examples:
 *               invalid_page:
 *                 value:
 *                   success: false
 *                   error: "Invalid page parameter. Must be a positive integer."
 *               invalid_limit:
 *                 value:
 *                   success: false
 *                   error: "Invalid limit parameter. Must be between 1 and 100."
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
 *                   example: "Failed to fetch roles"
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate pagination parameters
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error },
        { status: paginationResult.status }
      );
    }
    const { page, limit } = paginationResult;

    // Parse query parameters
    const statusParam = searchParams.get('status');
    const status: RoleStatus | undefined = statusParam === 'active' || statusParam === 'inactive' ? statusParam as RoleStatus : undefined;
    const sortBy = searchParams.get('sortBy') as 'name' | 'id' | 'created_at' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    // Validate parameters
    const options = {
      page,
      limit,
      status,
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
    };

    const result = await roleRepository.findAllPaginated(options);
    
    return NextResponse.json({
      success: true,
      roles: result.roles,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/roles:
 *   post:
 *     tags: ["Admin - Roles"]
 *     summary: "Create new role"
 *     description: "Creates a new role with comprehensive validation including name normalization, duplicate checking, and automatic ID generation. The role ID is automatically generated from the name using normalization and sanitization. Supports admin flag and status configuration."
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
 *                 description: "Role name (will be used to generate ID)"
 *                 example: "Content Moderator"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: "Role description"
 *                 example: "Responsible for moderating user-generated content and ensuring quality standards"
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive"]
 *                 description: "Role status"
 *                 default: "active"
 *                 example: "active"
 *               isAdmin:
 *                 type: boolean
 *                 description: "Whether this role has admin privileges"
 *                 default: false
 *                 example: false
 *             required: ["name", "description"]
 *     responses:
 *       201:
 *         description: "Role created successfully"
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
 *                   example: "Role created successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "content-moderator"
 *                 name: "Content Moderator"
 *                 description: "Responsible for moderating user-generated content and ensuring quality standards"
 *                 status: "active"
 *                 isAdmin: false
 *                 permissions: []
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T10:30:00.000Z"
 *               message: "Role created successfully"
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
 *                     missing_fields: "Missing required fields: name, description"
 *                     invalid_name_length: "Role name must be between 3 and 100 characters"
 *                     invalid_description_length: "Role description must be at most 500 characters"
 *                     invalid_id: "Unable to derive a valid role ID from name"
 *       409:
 *         description: "Conflict - Role with similar name already exists"
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
 *                   example: "Role with similar name already exists"
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
 *                   example: "Failed to create role"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roleData: CreateRoleRequest = body;

    // Validate required fields
    if (!roleData.name || !roleData.description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, description' },
        { status: 400 }
      );
    }

    // Generate stable ID from name (normalize, strip diacritics, collapse/trim hyphens)
    const id = roleData.name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);

    if (!id) {
      return NextResponse.json({ success: false, error: 'Unable to derive a valid role ID from name' }, { status: 400 });
    }

    // Validate name length
    if (roleData.name.length < 3 || roleData.name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Role name must be between 3 and 100 characters' },
        { status: 400 }
      );
    }

    // Validate description length
    if (roleData.description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Role description must be at most 500 characters' },
        { status: 400 }
      );
    }

    // Check for duplicate ID (including soft-deleted records)
    const isDuplicate = await roleRepository.exists(id, { includeDeleted: true });
    if (isDuplicate) {
      return NextResponse.json(
        { success: false, error: 'Role with similar name already exists' },
        { status: 409 }
      );
    }

    // Create the role data with proper structure
    const createData = {
      id,
      name: roleData.name,
      description: roleData.description,
      status: roleData.status || 'active',
      isAdmin: roleData.isAdmin || false,
      permissions: [], // Empty for now
    };

    // Create the role
    const newRole = await roleRepository.create(createData);

    return NextResponse.json(
      { success: true, data: newRole, message: 'Role created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating role:', error);

    if (error instanceof Error) {
      if (error.message.includes('already exists') ||
          error.message.includes('unique constraint') ||
          error.message.includes('duplicate key')) {
        return NextResponse.json(
          { success: false, error: 'Role with similar name already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create role' },
      { status: 500 }
    );
  }
} 