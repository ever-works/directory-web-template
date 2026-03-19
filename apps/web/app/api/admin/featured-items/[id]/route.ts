import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { featuredItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * @swagger
 * /api/admin/featured-items/{id}:
 *   get:
 *     tags: ["Admin - Featured Items"]
 *     summary: "Get featured item by ID"
 *     description: "Retrieves a specific featured item by its ID with complete details including metadata, status, and timestamps. Requires authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Featured item ID"
 *         example: "featured_123abc"
 *     responses:
 *       200:
 *         description: "Featured item retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/FeaturedItem"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "featured_123abc"
 *                 itemSlug: "awesome-productivity-tool"
 *                 itemName: "Awesome Productivity Tool"
 *                 itemIconUrl: "https://example.com/icons/productivity-tool.png"
 *                 itemCategory: "Productivity"
 *                 itemDescription: "A powerful tool to boost your productivity"
 *                 featuredOrder: 10
 *                 featuredAt: "2024-01-20T10:30:00.000Z"
 *                 featuredUntil: "2024-12-31T23:59:59.000Z"
 *                 featuredBy: "user_456def"
 *                 isActive: true
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T10:30:00.000Z"
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
 *       404:
 *         description: "Featured item not found"
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
 *                   example: "Featured item not found"
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
 *                   example: "Failed to fetch featured item"
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const featuredItem = await db
			.select()
			.from(featuredItems)
			.where(and(eq(featuredItems.id, id), eq(featuredItems.tenantId, tenantId)))
			.limit(1);

		if (featuredItem.length === 0) {
			return NextResponse.json({ success: false, error: 'Featured item not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: featuredItem[0]
		});
	} catch (error) {
		console.error('Error fetching featured item:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch featured item' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/featured-items/{id}:
 *   put:
 *     tags: ["Admin - Featured Items"]
 *     summary: "Update featured item"
 *     description: "Updates a featured item's properties including name, icon, category, description, order, expiration date, and active status. All fields are optional. Requires authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Featured item ID"
 *         example: "featured_123abc"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemName:
 *                 type: string
 *                 description: "Display name of the item"
 *                 example: "Updated Productivity Tool"
 *               itemIconUrl:
 *                 type: string
 *                 format: uri
 *                 description: "URL to the item's icon/logo"
 *                 example: "https://example.com/icons/updated-tool.png"
 *               itemCategory:
 *                 type: string
 *                 description: "Category of the item"
 *                 example: "Business Tools"
 *               itemDescription:
 *                 type: string
 *                 description: "Brief description of the item"
 *                 example: "An enhanced tool for business productivity"
 *               featuredOrder:
 *                 type: integer
 *                 description: "Display order (higher numbers appear first)"
 *                 example: 15
 *               featuredUntil:
 *                 type: string
 *                 format: date-time
 *                 description: "Optional expiration date for featuring"
 *                 example: "2024-12-31T23:59:59.000Z"
 *               isActive:
 *                 type: boolean
 *                 description: "Whether the featured item is active"
 *                 example: true
 *     responses:
 *       200:
 *         description: "Featured item updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/FeaturedItem"
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Featured item updated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "featured_123abc"
 *                 itemSlug: "awesome-productivity-tool"
 *                 itemName: "Updated Productivity Tool"
 *                 itemIconUrl: "https://example.com/icons/updated-tool.png"
 *                 itemCategory: "Business Tools"
 *                 itemDescription: "An enhanced tool for business productivity"
 *                 featuredOrder: 15
 *                 featuredAt: "2024-01-20T10:30:00.000Z"
 *                 featuredUntil: "2024-12-31T23:59:59.000Z"
 *                 featuredBy: "user_456def"
 *                 isActive: true
 *                 createdAt: "2024-01-20T10:30:00.000Z"
 *                 updatedAt: "2024-01-20T16:45:00.000Z"
 *               message: "Featured item updated successfully"
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
 *       404:
 *         description: "Featured item not found"
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
 *                   example: "Featured item not found"
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
 *                   example: "Failed to update featured item"
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const body = await request.json();
		const { itemName, itemIconUrl, itemCategory, itemDescription, featuredOrder, featuredUntil, isActive } = body;

		const { id } = await params;
		// Update featured item
		const updatedItem = await db
			.update(featuredItems)
			.set({
				itemName,
				itemIconUrl,
				itemCategory,
				itemDescription,
				featuredOrder,
				featuredUntil: featuredUntil ? new Date(featuredUntil) : null,
				isActive,
				updatedAt: new Date()
			})
			.where(and(eq(featuredItems.id, id), eq(featuredItems.tenantId, tenantId)))
			.returning();

		if (updatedItem.length === 0) {
			return NextResponse.json({ success: false, error: 'Featured item not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: updatedItem[0],
			message: 'Featured item updated successfully'
		});
	} catch (error) {
		console.error('Error updating featured item:', error);
		return NextResponse.json({ success: false, error: 'Failed to update featured item' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/featured-items/{id}:
 *   delete:
 *     tags: ["Admin - Featured Items"]
 *     summary: "Remove featured item"
 *     description: "Performs a soft delete on a featured item by setting isActive to false. The item remains in the database but is no longer featured. This action can be reversed by updating the item's isActive status. Requires authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Featured item ID to remove"
 *         example: "featured_123abc"
 *     responses:
 *       200:
 *         description: "Featured item removed successfully"
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
 *                   example: "Featured item removed successfully"
 *               required: ["success", "message"]
 *             example:
 *               success: true
 *               message: "Featured item removed successfully"
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
 *       404:
 *         description: "Featured item not found"
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
 *                   example: "Featured item not found"
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
 *                   example: "Failed to remove featured item"
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const { id } = await params;
		// Soft delete by setting isActive to false
		const updatedItem = await db
			.update(featuredItems)
			.set({
				isActive: false,
				updatedAt: new Date()
			})
			.where(and(eq(featuredItems.id, id), eq(featuredItems.tenantId, tenantId)))
			.returning();

		if (updatedItem.length === 0) {
			return NextResponse.json({ success: false, error: 'Featured item not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: 'Featured item removed successfully'
		});
	} catch (error) {
		console.error('Error removing featured item:', error);
		return NextResponse.json({ success: false, error: 'Failed to remove featured item' }, { status: 500 });
	}
}
