import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCompanyById, updateCompany, deleteCompany, getCompanyByDomain, getCompanyBySlug } from '@/lib/db/queries';
import { updateCompanySchema } from '@/lib/validations/company';
import { ZodError } from 'zod';

/**
 * @swagger
 * /api/admin/companies/{id}:
 *   get:
 *     tags: ["Admin - Companies"]
 *     summary: "Get company by ID"
 *     description: "Retrieves a specific company by ID. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company UUID"
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: "Company retrieved successfully"
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
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T14:45:00.000Z"
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
 *       404:
 *         description: "Company not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Company not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch company"
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const company = await getCompanyById(id);

		if (!company) {
			return NextResponse.json({ error: 'Company not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: company
		});
	} catch (error) {
		console.error('Error fetching company:', error);
		return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/companies/{id}:
 *   put:
 *     tags: ["Admin - Companies"]
 *     summary: "Update company"
 *     description: "Updates a specific company by ID. Supports partial updates. Domain and slug are normalized to lowercase. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company UUID"
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "Company name"
 *                 example: "Acme Corporation Updated"
 *                 minLength: 1
 *                 maxLength: 255
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: "Company website URL"
 *                 example: "https://acme.com"
 *               domain:
 *                 type: string
 *                 description: "Company domain (normalized to lowercase)"
 *                 example: "acme.com"
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 description: "URL-friendly identifier (normalized to lowercase)"
 *                 example: "acme-corporation"
 *                 pattern: "^[a-z0-9-]+$"
 *                 maxLength: 255
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive"]
 *                 description: "Company status"
 *                 example: "active"
 *           example:
 *             name: "Acme Corporation Updated"
 *             website: "https://acme.com"
 *             status: "active"
 *     responses:
 *       200:
 *         description: "Company updated successfully"
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
 *                 name: "Acme Corporation Updated"
 *                 website: "https://acme.com"
 *                 domain: "acme.com"
 *                 slug: "acme-corporation"
 *                 status: "active"
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T16:30:00.000Z"
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
 *                 - field: "slug"
 *                   message: "Slug must contain only lowercase letters, numbers, and hyphens"
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
 *       404:
 *         description: "Company not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Company not found"
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
 *                   example: "Failed to update company"
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		// Check if company exists
		const existingCompany = await getCompanyById(id);
		if (!existingCompany) {
			return NextResponse.json({ error: 'Company not found' }, { status: 404 });
		}

		const body = await request.json();

		// Validate request body
		let validatedData;
		try {
			validatedData = updateCompanySchema.parse({ id, ...body });
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

		// Check for domain uniqueness if domain is being updated
		if (validatedData.domain && validatedData.domain !== existingCompany.domain) {
			const existingByDomain = await getCompanyByDomain(validatedData.domain);
			if (existingByDomain && existingByDomain.id !== id) {
				return NextResponse.json(
					{ error: `Company with domain '${validatedData.domain}' already exists` },
					{ status: 409 }
				);
			}
		}

		// Check for slug uniqueness if slug is being updated
		if (validatedData.slug && validatedData.slug !== existingCompany.slug) {
			const existingBySlug = await getCompanyBySlug(validatedData.slug);
			if (existingBySlug && existingBySlug.id !== id) {
				return NextResponse.json(
					{ error: `Company with slug '${validatedData.slug}' already exists` },
					{ status: 409 }
				);
			}
		}

		// Remove id from update data
		const { id: _idToRemove, ...updateData } = validatedData;

		// Update company
		const company = await updateCompany(id, updateData);

		if (!company) {
			return NextResponse.json({ error: 'Company not found' }, { status: 404 });
		}

		// Direct CRM sync: blocks response but with retry/timeout (non-blocking for DB)
		const crmEnabled = process.env.TWENTY_CRM_ENABLED !== 'false';
		if (crmEnabled) {
			try {
				const { createTwentyCrmSyncServiceFromEnv } = await import(
					'@/lib/services/twenty-crm-sync-factory'
				);
				const { mapCompanyToTwentyCompany } = await import(
					'@/lib/mappers/twenty-crm.mapper'
				);

				const syncService = createTwentyCrmSyncServiceFromEnv();

				// Sync company to CRM
				const companyPayload = mapCompanyToTwentyCompany(company);
				const syncResult = await syncService.upsertCompany(companyPayload);

				console.log(`[CRM Sync] ✅ Company ${id} update synced to CRM`, {
					crmId: syncResult.id,
					updated: syncResult.updated,
				});
			} catch (crmError) {
				// Non-blocking: log error but don't fail company update
				console.error(`[CRM Sync] ❌ Failed to sync company update ${id}:`, crmError);
			}
		}

		return NextResponse.json({
			success: true,
			data: company
		});
	} catch (error) {
		console.error('Error updating company:', error);

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

		return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/companies/{id}:
 *   delete:
 *     tags: ["Admin - Companies"]
 *     summary: "Delete company"
 *     description: "Permanently deletes a company by ID. This action cannot be undone. Associated item-company links will be removed via CASCADE. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company UUID"
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: "Company deleted successfully"
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
 *                   example: "Company deleted successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Company deleted successfully"
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
 *       404:
 *         description: "Company not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Company not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to delete company"
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const success = await deleteCompany(id);

		if (!success) {
			return NextResponse.json({ error: 'Company not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: 'Company deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting company:', error);
		return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
	}
}
