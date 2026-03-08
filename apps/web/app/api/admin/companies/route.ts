import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listCompanies, createCompany, getCompanyByDomain, getCompanyBySlug } from '@/lib/db/queries';
import { createCompanySchema } from '@/lib/validations/company';
import { ZodError } from 'zod';

/**
 * @swagger
 * /api/admin/companies:
 *   get:
 *     tags: ["Admin - Companies"]
 *     summary: "List companies"
 *     description: "Returns a paginated list of companies with filtering options. Supports search by name/domain, status filtering. Requires admin privileges."
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
 *         description: "Number of companies per page"
 *         example: 10
 *       - name: "q"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Search term for company name or domain (case-insensitive)"
 *         example: "acme"
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["active", "inactive"]
 *         description: "Filter by company status"
 *         example: "active"
 *     responses:
 *       200:
 *         description: "Companies retrieved successfully"
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
 *                     companies:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Company"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     total:
 *                       type: integer
 *                       example: 47
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     activeCount:
 *                       type: integer
 *                       example: 40
 *                       description: "Global count of active companies (unfiltered)"
 *                     inactiveCount:
 *                       type: integer
 *                       example: 7
 *                       description: "Global count of inactive companies (unfiltered)"
 *                   required: ["page", "totalPages", "total", "limit", "activeCount", "inactiveCount"]
 *               required: ["success", "data", "meta"]
 *             example:
 *               success: true
 *               data:
 *                 companies:
 *                   - id: "550e8400-e29b-41d4-a716-446655440000"
 *                     name: "Acme Corporation"
 *                     website: "https://acme.com"
 *                     domain: "acme.com"
 *                     slug: "acme-corporation"
 *                     status: "active"
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *                     updatedAt: "2024-01-20T14:45:00.000Z"
 *                   - id: "660e8400-e29b-41d4-a716-446655440001"
 *                     name: "Beta Industries"
 *                     website: "https://beta.io"
 *                     domain: "beta.io"
 *                     slug: "beta-industries"
 *                     status: "active"
 *                     createdAt: "2024-01-16T09:15:00.000Z"
 *                     updatedAt: "2024-01-20T16:20:00.000Z"
 *               meta:
 *                 page: 1
 *                 totalPages: 5
 *                 total: 47
 *                 limit: 10
 *                 activeCount: 40
 *                 inactiveCount: 7
 *       400:
 *         description: "Bad request - Invalid pagination parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               invalid_page:
 *                 value:
 *                   error: "Invalid page parameter. Must be a positive integer."
 *               invalid_limit:
 *                 value:
 *                   error: "Invalid limit parameter. Must be between 1 and 100."
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
 *                   example: "Failed to fetch companies"
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);

		// Parse and validate pagination parameters
		const pageParam = searchParams.get('page');
		const limitParam = searchParams.get('limit');

		const page = pageParam ? parseInt(pageParam, 10) : 1;
		const limit = limitParam ? parseInt(limitParam, 10) : 10;

		// Validate page parameter
		if (isNaN(page) || page < 1) {
			return NextResponse.json(
				{ error: 'Invalid page parameter. Must be a positive integer.' },
				{ status: 400 }
			);
		}

		// Validate limit parameter
		if (isNaN(limit) || limit < 1 || limit > 100) {
			return NextResponse.json(
				{ error: 'Invalid limit parameter. Must be between 1 and 100.' },
				{ status: 400 }
			);
		}

		const q = searchParams.get('q') || undefined;
		const status = searchParams.get('status') as 'active' | 'inactive' | undefined;

		const result = await listCompanies({
			page,
			limit,
			search: q,
			status
		});

		return NextResponse.json({
			success: true,
			data: { companies: result.companies },
			meta: {
				page: result.page,
				totalPages: result.totalPages,
				total: result.total,
				limit: result.limit,
				activeCount: result.activeCount,
				inactiveCount: result.inactiveCount
			}
		});
	} catch (error) {
		console.error('Error fetching companies:', error);
		return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/companies:
 *   post:
 *     tags: ["Admin - Companies"]
 *     summary: "Create company"
 *     description: "Creates a new company with validation and conflict handling. Domain and slug are normalized to lowercase. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "Company name (required)"
 *                 example: "Acme Corporation"
 *                 minLength: 1
 *                 maxLength: 255
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: "Company website URL (optional)"
 *                 example: "https://acme.com"
 *               domain:
 *                 type: string
 *                 description: "Company domain (optional, normalized to lowercase)"
 *                 example: "acme.com"
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 description: "URL-friendly identifier (optional, normalized to lowercase)"
 *                 example: "acme-corporation"
 *                 pattern: "^[a-z0-9-]+$"
 *                 maxLength: 255
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive"]
 *                 default: "active"
 *                 description: "Company status (optional)"
 *                 example: "active"
 *             required: ["name"]
 *           example:
 *             name: "Acme Corporation"
 *             website: "https://acme.com"
 *             domain: "acme.com"
 *             slug: "acme-corporation"
 *             status: "active"
 *     responses:
 *       201:
 *         description: "Company created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Company"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 name: "Acme Corporation"
 *                 website: "https://acme.com"
 *                 domain: "acme.com"
 *                 slug: "acme-corporation"
 *                 status: "active"
 *                 createdAt: "2024-01-20T16:45:00.000Z"
 *                 updatedAt: "2024-01-20T16:45:00.000Z"
 *       400:
 *         description: "Bad request - Validation error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation error"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *             example:
 *               error: "Validation error"
 *               details:
 *                 - field: "name"
 *                   message: "Company name is required"
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
 *       409:
 *         description: "Conflict - Domain or slug already exists"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Company with this domain already exists"
 *             examples:
 *               domain_conflict:
 *                 value:
 *                   error: "Company with domain 'acme.com' already exists"
 *               slug_conflict:
 *                 value:
 *                   error: "Company with slug 'acme-corporation' already exists"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create company"
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();

		// Validate request body
		let validatedData;
		try {
			validatedData = createCompanySchema.parse(body);
		} catch (error) {
			if (error instanceof ZodError) {
				const details = error.issues.map((err) => ({
					field: err.path.join('.'),
					message: err.message
				}));
				return NextResponse.json({ error: 'Validation error', details }, { status: 400 });
			}
			throw error;
		}

		// Check for domain uniqueness if domain is provided
		if (validatedData.domain) {
			const existingByDomain = await getCompanyByDomain(validatedData.domain);
			if (existingByDomain) {
				return NextResponse.json(
					{ error: `Company with domain '${validatedData.domain}' already exists` },
					{ status: 409 }
				);
			}
		}

		// Check for slug uniqueness if slug is provided
		if (validatedData.slug) {
			const existingBySlug = await getCompanyBySlug(validatedData.slug);
			if (existingBySlug) {
				return NextResponse.json(
					{ error: `Company with slug '${validatedData.slug}' already exists` },
					{ status: 409 }
				);
			}
		}

		// Create company
		const company = await createCompany(validatedData);

		return NextResponse.json(
			{
				success: true,
				data: company
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating company:', error);

		// Handle database unique constraint violations
		if (error instanceof Error) {
			if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
				if (error.message.toLowerCase().includes('domain')) {
					return NextResponse.json({ error: 'Company with this domain already exists' }, { status: 409 });
				}
				if (error.message.toLowerCase().includes('slug')) {
					return NextResponse.json({ error: 'Company with this slug already exists' }, { status: 409 });
				}
				return NextResponse.json({ error: 'Company with this information already exists' }, { status: 409 });
			}
		}

		return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
	}
}
