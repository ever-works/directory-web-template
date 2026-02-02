import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRepository } from '@/lib/repositories/user.repository';
import { RoleRepository } from '@/lib/repositories/role.repository';
import { CreateUserRequest, UserListOptions } from '@/lib/types/user';
import { isValidEmail } from '@/lib/utils/email-validation';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: ["Admin - Users"]
 *     summary: "Get paginated users list"
 *     description: "Returns a paginated list of users with advanced filtering, searching, and sorting capabilities. Supports comprehensive user management for admin interfaces including search by name/email/username, role filtering, status filtering, and flexible sorting options. Requires admin privileges."
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
 *         description: "Number of users per page"
 *         example: 10
 *       - name: "search"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: "Search term for name, email, or username"
 *         example: "john"
 *       - name: "role"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 50
 *         description: "Filter by user role"
 *         example: "admin"
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["active", "inactive"]
 *         description: "Filter by user status"
 *         example: "active"
 *       - name: "sortBy"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["name", "username", "email", "role", "created_at"]
 *           default: "name"
 *         description: "Field to sort by"
 *         example: "created_at"
 *       - name: "sortOrder"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "asc"
 *         description: "Sort order"
 *         example: "desc"
 *       - name: "includeInactive"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: "Whether to include inactive users"
 *         example: true
 *     responses:
 *       200:
 *         description: "Users list retrieved successfully"
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
 *                     $ref: "#/components/schemas/User"
 *                 total:
 *                   type: integer
 *                   description: "Total number of users"
 *                   example: 156
 *                 page:
 *                   type: integer
 *                   description: "Current page number"
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: "Number of users per page"
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   description: "Total number of pages"
 *                   example: 16
 *               required: ["success", "data", "total", "page", "limit", "totalPages"]
 *             example:
 *               success: true
 *               data:
 *                 - id: "user_123abc"
 *                   username: "johndoe"
 *                   email: "john.doe@example.com"
 *                   name: "John Doe"
 *                   title: "Senior Developer"
 *                   avatar: "https://example.com/avatars/john.jpg"
 *                   role: "admin"
 *                   status: "active"
 *                   created_at: "2024-01-20T10:30:00.000Z"
 *                   updated_at: "2024-01-20T14:45:00.000Z"
 *                   last_login: "2024-01-20T16:20:00.000Z"
 *                 - id: "user_456def"
 *                   username: "janesmith"
 *                   email: "jane.smith@example.com"
 *                   name: "Jane Smith"
 *                   title: "Product Manager"
 *                   avatar: "https://example.com/avatars/jane.jpg"
 *                   role: "moderator"
 *                   status: "active"
 *                   created_at: "2024-01-19T15:20:00.000Z"
 *                   updated_at: "2024-01-19T15:20:00.000Z"
 *                   last_login: "2024-01-20T09:15:00.000Z"
 *               total: 156
 *               page: 1
 *               limit: 10
 *               totalPages: 16
 *       400:
 *         description: "Bad request - Invalid parameters"
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
 *                     invalid_page: "Invalid page parameter. Must be a positive integer."
 *                     invalid_limit: "Invalid limit parameter. Must be between 1 and 100."
 *                     invalid_status: "Invalid status parameter"
 *                     invalid_sort: "Invalid sortBy parameter"
 *                     search_too_long: "Search parameter too long"
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
export async function GET(request: NextRequest) {
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

		// Parse query parameters
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

		const search = searchParams.get('search') || undefined;
		const role = searchParams.get('role') || undefined;
		const status = searchParams.get('status') as 'active' | 'inactive' | undefined;

		// Validate status value
		if (status && !['active', 'inactive'].includes(status)) {
			return NextResponse.json({ success: false, error: 'Invalid status parameter' }, { status: 400 });
		}

		const sortBy = searchParams.get('sortBy') as 'name' | 'username' | 'email' | 'role' | 'created_at' | undefined;

		// Validate sortBy value
		const validSortFields = ['name', 'username', 'email', 'role', 'created_at'];
		if (sortBy && !validSortFields.includes(sortBy)) {
			return NextResponse.json({ success: false, error: 'Invalid sortBy parameter' }, { status: 400 });
		}

		const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

		// Validate sortOrder value
		if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
			return NextResponse.json({ success: false, error: 'Invalid sortOrder parameter' }, { status: 400 });
		}

		const includeInactive = searchParams.get('includeInactive') === 'true';

		// Validate search parameter length
		if (search && search.length > 100) {
			return NextResponse.json({ success: false, error: 'Search parameter too long' }, { status: 400 });
		}

		// Validate role parameter length
		if (role && role.length > 50) {
			return NextResponse.json({ success: false, error: 'Role parameter too long' }, { status: 400 });
		}

		// Build options object
		const options: UserListOptions = {
			page,
			limit,
			search,
			role,
			status,
			sortBy,
			sortOrder,
			includeInactive
		};

		// Get users - extract tenantId from session
		const tenantId = session.user.tenantId;
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'No tenant ID found in session' }, { status: 401 });
		}

		const userRepository = new UserRepository();
		const result = await userRepository.findAll(tenantId, options);

		return NextResponse.json({
			success: true,
			data: result.users,
			total: result.total,
			page: result.page,
			limit: result.limit,
			totalPages: result.totalPages
		});
	} catch (error) {
		console.error('Error in GET /api/admin/users:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     tags: ["Admin - Users"]
 *     summary: "Create new user"
 *     description: "Creates a new user with comprehensive validation including email format, username format, password strength, and role verification. Supports optional fields like title and avatar. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 pattern: "^[a-zA-Z0-9_-]{3,30}$"
 *                 description: "Unique username (3-30 chars, alphanumeric, dash, underscore)"
 *                 example: "johndoe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Valid email address"
 *                 example: "john.doe@example.com"
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: "Full name"
 *                 example: "John Doe"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: "Password (minimum 8 characters)"
 *                 example: "SecurePass123!"
 *               role:
 *                 type: string
 *                 description: "User role (must exist in system)"
 *                 example: "admin"
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: "Job title or position"
 *                 example: "Senior Developer"
 *               avatar:
 *                 type: string
 *                 maxLength: 500
 *                 format: uri
 *                 description: "Avatar image URL"
 *                 example: "https://example.com/avatars/john.jpg"
 *             required: ["username", "email", "name", "password", "role"]
 *     responses:
 *       201:
 *         description: "User created successfully"
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
 *                 updated_at: "2024-01-20T10:30:00.000Z"
 *                 last_login: null
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
 *                     missing_fields: "Missing required fields: username, email, name, password, and role are required"
 *                     invalid_email: "Invalid email format"
 *                     invalid_username: "Username must be 3-30 characters and contain only letters, numbers, dashes, and underscores"
 *                     invalid_name: "Name must be between 2 and 100 characters"
 *                     weak_password: "Password must be at least 8 characters long"
 *                     invalid_role: "Invalid role"
 *                     duplicate_email: "Email already exists"
 *                     duplicate_username: "Username already exists"
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
export async function POST(request: NextRequest) {
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

		// Parse request body
		const body = await request.json();

		// Validate request body structure
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
		}

		// Validate required fields
		if (!body.username || !body.email || !body.name || !body.password || !body.role) {
			return NextResponse.json(
				{
					success: false,
					error: 'Missing required fields: username, email, name, password, and role are required'
				},
				{ status: 400 }
			);
		}

		// Validate email format
		if (!isValidEmail(body.email)) {
			return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
		}

		// Validate username format (alphanumeric, dash, underscore)
		const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
		if (!usernameRegex.test(body.username)) {
			return NextResponse.json(
				{
					success: false,
					error: 'Username must be 3-30 characters and contain only letters, numbers, dashes, and underscores'
				},
				{ status: 400 }
			);
		}

		// Validate name length
		if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
			return NextResponse.json(
				{ success: false, error: 'Name must be between 2 and 100 characters' },
				{ status: 400 }
			);
		}

		// Validate password strength
		if (typeof body.password !== 'string' || body.password.length < 8) {
			return NextResponse.json(
				{ success: false, error: 'Password must be at least 8 characters long' },
				{ status: 400 }
			);
		}

		// Validate title if provided
		if (body.title !== undefined && body.title !== null) {
			if (typeof body.title !== 'string') {
				return NextResponse.json({ success: false, error: 'Title must be a string' }, { status: 400 });
			}
			if (body.title.length > 100) {
				return NextResponse.json(
					{ success: false, error: 'Title must be at most 100 characters' },
					{ status: 400 }
				);
			}
		}

		// Validate avatar if provided
		if (body.avatar !== undefined && body.avatar !== null) {
			if (typeof body.avatar !== 'string') {
				return NextResponse.json({ success: false, error: 'Avatar must be a string' }, { status: 400 });
			}
			if (body.avatar.length > 500) {
				return NextResponse.json(
					{ success: false, error: 'Avatar URL must be at most 500 characters' },
					{ status: 400 }
				);
			}
		}

		// Validate role exists in the system
		if (typeof body.role !== 'string' || body.role.trim().length === 0) {
			return NextResponse.json({ success: false, error: 'Role cannot be empty' }, { status: 400 });
		}

		const roleRepository = new RoleRepository();
		const roleExists = await roleRepository.findById(body.role);
		if (!roleExists) {
			return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
		}

		const userData: CreateUserRequest = {
			username: body.username.trim(),
			email: body.email.trim().toLowerCase(),
			name: body.name.trim(),
			title: body.title?.trim() || undefined,
			avatar: body.avatar?.trim() || undefined,
			role: body.role.trim(),
			password: body.password
		};

		// Create user - extract tenantId from session
		const tenantId = session.user.tenantId;
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'No tenant ID found in session' }, { status: 401 });
		}

		const userRepository = new UserRepository();
		const newUser = await userRepository.create(userData, tenantId);

		return NextResponse.json({ success: true, data: newUser }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/admin/users:', error);

		if (error instanceof Error) {
			return NextResponse.json({ success: false, error: error.message }, { status: 400 });
		}

		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}
