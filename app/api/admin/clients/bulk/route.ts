import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateClientProfile, deleteClientProfile } from '@/lib/db/queries';

/**
 * @swagger
 * /api/admin/clients/bulk:
 *   put:
 *     tags: ["Admin - Clients"]
 *     summary: "Bulk update client profiles"
 *     description: "Updates multiple client profiles in a single request. Processes each client individually and returns detailed results including successes and failures. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Client ID (required)"
 *                       example: "client_123abc"
 *                     displayName:
 *                       type: string
 *                       description: "Display name"
 *                       example: "John Doe Updated"
 *                     username:
 *                       type: string
 *                       description: "Username"
 *                       example: "johndoe_updated"
 *                     bio:
 *                       type: string
 *                       description: "Biography"
 *                       example: "Senior Developer at Tech Corp"
 *                     jobTitle:
 *                       type: string
 *                       description: "Job title"
 *                       example: "Lead Developer"
 *                     company:
 *                       type: string
 *                       description: "Company name"
 *                       example: "Tech Corp Inc"
 *                     status:
 *                       type: string
 *                       enum: ["active", "inactive", "suspended", "trial"]
 *                       description: "Account status"
 *                       example: "active"
 *                     plan:
 *                       type: string
 *                       enum: ["free", "standard", "premium"]
 *                       description: "Subscription plan"
 *                       example: "premium"
 *                     accountType:
 *                       type: string
 *                       enum: ["individual", "business", "enterprise"]
 *                       description: "Account type"
 *                       example: "business"
 *                   required: ["id"]
 *                 description: "Array of client updates"
 *                 minItems: 1
 *                 maxItems: 100
 *             required: ["clients"]
 *     responses:
 *       200:
 *         description: "Bulk update completed (may include partial failures)"
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
 *                   example: "Bulk update completed: 2 successful, 1 failed"
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                         description: "Index in the original array"
 *                         example: 0
 *                       success:
 *                         type: boolean
 *                         example: true
 *                       data:
 *                         $ref: "#/components/schemas/ClientProfile"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                         description: "Index in the original array"
 *                         example: 2
 *                       error:
 *                         type: string
 *                         example: "Client not found"
 *                       clientData:
 *                         type: object
 *                         description: "Original client data that failed"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     successful:
 *                       type: integer
 *                       example: 2
 *                     failed:
 *                       type: integer
 *                       example: 1
 *               required: ["success", "message", "results", "errors", "summary"]
 *             example:
 *               success: true
 *               message: "Bulk update completed: 2 successful, 1 failed"
 *               results:
 *                 - index: 0
 *                   success: true
 *                   data:
 *                     id: "client_123abc"
 *                     displayName: "John Doe Updated"
 *                     username: "johndoe_updated"
 *                     email: "john.doe@example.com"
 *                     status: "active"
 *                     plan: "premium"
 *                     updatedAt: "2024-01-20T16:45:00.000Z"
 *                 - index: 1
 *                   success: true
 *                   data:
 *                     id: "client_456def"
 *                     displayName: "Jane Smith Updated"
 *                     username: "janesmith_updated"
 *                     email: "jane.smith@example.com"
 *                     status: "active"
 *                     plan: "standard"
 *                     updatedAt: "2024-01-20T16:45:00.000Z"
 *               errors:
 *                 - index: 2
 *                   error: "Client not found"
 *                   clientData:
 *                     id: "client_nonexistent"
 *                     displayName: "Non Existent"
 *               summary:
 *                 total: 3
 *                 successful: 2
 *                 failed: 1
 *       400:
 *         description: "Bad request - Invalid input"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid request: clients array is required"
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
 *                   example: "Failed to process bulk update"
 */
export async function PUT(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = session.user.tenantId;
		if (!tenantId) {
			return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
		}

		const body = await request.json();

		// Validate that we have a valid array of client updates
		if (!Array.isArray(body.clients) || body.clients.length === 0) {
			return NextResponse.json(
				{
					error: 'Invalid request: clients array is required'
				},
				{ status: 400 }
			);
		}

		const results = [];
		const errors = [];

		// Process each client update
		for (const [index, clientData] of body.clients.entries()) {
			try {
				// Validate required fields for each client
				if (!clientData.id) {
					errors.push({
						index,
						error: 'Client ID is required',
						clientData
					});
					continue;
				}

				const updateData = {
					displayName: clientData.displayName,
					username: clientData.username,
					bio: clientData.bio,
					jobTitle: clientData.jobTitle,
					company: clientData.company,
					industry: clientData.industry,
					phone: clientData.phone,
					website: clientData.website,
					location: clientData.location,
					accountType: clientData.accountType,
					status: clientData.status,
					plan: clientData.plan,
					timezone: clientData.timezone,
					language: clientData.language,
					twoFactorEnabled: clientData.twoFactorEnabled,
					emailVerified: clientData.emailVerified
				};

				const updatedClient = await updateClientProfile(clientData.id, updateData, tenantId);

				if (updatedClient) {
					results.push({
						index,
						success: true,
						data: updatedClient
					});
				} else {
					errors.push({
						index,
						error: 'Client not found',
						clientData
					});
				}
			} catch (error) {
				errors.push({
					index,
					error: error instanceof Error ? error.message : 'Unknown error',
					clientData
				});
			}
		}

		return NextResponse.json({
			success: true,
			message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
			results,
			errors,
			summary: {
				total: body.clients.length,
				successful: results.length,
				failed: errors.length
			}
		});
	} catch (error) {
		console.error('Error in bulk client update:', error);
		return NextResponse.json({ error: 'Failed to process bulk update' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/clients/bulk:
 *   delete:
 *     tags: ["Admin - Clients"]
 *     summary: "Bulk delete client profiles"
 *     description: "Deletes multiple client profiles in a single request. Processes each client individually and returns detailed results including successes and failures. This action cannot be undone. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Client ID to delete (required)"
 *                       example: "client_123abc"
 *                   required: ["id"]
 *                 description: "Array of client identifiers to delete"
 *                 minItems: 1
 *                 maxItems: 100
 *             required: ["clients"]
 *     responses:
 *       200:
 *         description: "Bulk deletion completed (may include partial failures)"
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
 *                   example: "Bulk deletion completed: 2 successful, 1 failed"
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                         description: "Index in the original array"
 *                         example: 0
 *                       success:
 *                         type: boolean
 *                         example: true
 *                       clientId:
 *                         type: string
 *                         description: "ID of the deleted client"
 *                         example: "client_123abc"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                         description: "Index in the original array"
 *                         example: 2
 *                       error:
 *                         type: string
 *                         example: "Client not found"
 *                       clientData:
 *                         type: object
 *                         description: "Original client data that failed"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     successful:
 *                       type: integer
 *                       example: 2
 *                     failed:
 *                       type: integer
 *                       example: 1
 *               required: ["success", "message", "results", "errors", "summary"]
 *             example:
 *               success: true
 *               message: "Bulk deletion completed: 2 successful, 1 failed"
 *               results:
 *                 - index: 0
 *                   success: true
 *                   clientId: "client_123abc"
 *                 - index: 1
 *                   success: true
 *                   clientId: "client_456def"
 *               errors:
 *                 - index: 2
 *                   error: "Client not found"
 *                   clientData:
 *                     id: "client_nonexistent"
 *               summary:
 *                 total: 3
 *                 successful: 2
 *                 failed: 1
 *       400:
 *         description: "Bad request - Invalid input"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid request: clients array is required"
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
 *                   example: "Failed to process bulk deletion"
 */
export async function DELETE(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = session.user.tenantId;
		if (!tenantId) {
			return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
		}

		const body = await request.json();

		// Validate that we have a valid array of client identifiers
		if (!Array.isArray(body.clients) || body.clients.length === 0) {
			return NextResponse.json(
				{
					error: 'Invalid request: clients array is required'
				},
				{ status: 400 }
			);
		}

		const results = [];
		const errors = [];

		// Process each client deletion
		for (const [index, clientData] of body.clients.entries()) {
			try {
				// Validate required fields for each client
				if (!clientData.id) {
					errors.push({
						index,
						error: 'Client ID is required',
						clientData
					});
					continue;
				}

				const success = await deleteClientProfile(clientData.id, tenantId);

				if (success) {
					results.push({
						index,
						success: true,
						clientId: clientData.id
					});
				} else {
					errors.push({
						index,
						error: 'Client not found',
						clientData
					});
				}
			} catch (error) {
				errors.push({
					index,
					error: error instanceof Error ? error.message : 'Unknown error',
					clientData
				});
			}
		}

		return NextResponse.json({
			success: true,
			message: `Bulk deletion completed: ${results.length} successful, ${errors.length} failed`,
			results,
			errors,
			summary: {
				total: body.clients.length,
				successful: results.length,
				failed: errors.length
			}
		});
	} catch (error) {
		console.error('Error in bulk client deletion:', error);
		return NextResponse.json({ error: 'Failed to process bulk deletion' }, { status: 500 });
	}
}
