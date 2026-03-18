import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { featuredItems } from '@/lib/db/schema';
import { eq, desc, and, gte, or, isNull } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * @swagger
 * /api/featured-items:
 *   get:
 *     tags: ["Featured Items"]
 *     summary: "Get featured items for public display"
 *     description: "Returns a list of active featured items for public display on the website. Automatically filters out inactive items and optionally excludes expired items based on their featured_until date. Items are sorted by featured order and date for optimal presentation. This is a public endpoint that doesn't require authentication."
 *     parameters:
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 6
 *         description: "Maximum number of featured items to return"
 *         example: 6
 *       - name: "includeExpired"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: "Whether to include items past their featured_until date"
 *         example: false
 *     responses:
 *       200:
 *         description: "Featured items retrieved successfully"
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: "Featured item ID"
 *                         example: "featured_123abc"
 *                       itemSlug:
 *                         type: string
 *                         description: "Item slug identifier"
 *                         example: "awesome-productivity-tool"
 *                       itemName:
 *                         type: string
 *                         description: "Item display name"
 *                         example: "Awesome Productivity Tool"
 *                       itemDescription:
 *                         type: string
 *                         nullable: true
 *                         description: "Item description for featured display"
 *                         example: "Boost your productivity with this amazing tool"
 *                       itemIconUrl:
 *                         type: string
 *                         nullable: true
 *                         description: "Item icon URL"
 *                         example: "https://example.com/icons/tool.png"
 *                       itemImageUrl:
 *                         type: string
 *                         nullable: true
 *                         description: "Featured image URL"
 *                         example: "https://example.com/featured/tool-banner.jpg"
 *                       featuredOrder:
 *                         type: integer
 *                         description: "Display order (higher = more prominent)"
 *                         example: 10
 *                       isActive:
 *                         type: boolean
 *                         description: "Whether the item is currently featured"
 *                         example: true
 *                       featuredAt:
 *                         type: string
 *                         format: date-time
 *                         description: "When the item was featured"
 *                         example: "2024-01-20T10:30:00.000Z"
 *                       featuredUntil:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: "When the featured status expires (null = no expiration)"
 *                         example: "2024-02-20T10:30:00.000Z"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: "When the featured item record was created"
 *                         example: "2024-01-20T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: "When the featured item was last updated"
 *                         example: "2024-01-20T10:30:00.000Z"
 *                 count:
 *                   type: integer
 *                   description: "Number of featured items returned"
 *                   example: 3
 *               required: ["success", "data", "count"]
 *             example:
 *               success: true
 *               data:
 *                 - id: "featured_123abc"
 *                   itemSlug: "awesome-productivity-tool"
 *                   itemName: "Awesome Productivity Tool"
 *                   itemDescription: "Boost your productivity with this amazing tool"
 *                   itemIconUrl: "https://example.com/icons/tool.png"
 *                   itemImageUrl: "https://example.com/featured/tool-banner.jpg"
 *                   featuredOrder: 10
 *                   isActive: true
 *                   featuredAt: "2024-01-20T10:30:00.000Z"
 *                   featuredUntil: "2024-02-20T10:30:00.000Z"
 *                   createdAt: "2024-01-20T10:30:00.000Z"
 *                   updatedAt: "2024-01-20T10:30:00.000Z"
 *                 - id: "featured_456def"
 *                   itemSlug: "great-design-app"
 *                   itemName: "Great Design App"
 *                   itemDescription: "Create stunning designs effortlessly"
 *                   itemIconUrl: "https://example.com/icons/design.png"
 *                   itemImageUrl: "https://example.com/featured/design-banner.jpg"
 *                   featuredOrder: 8
 *                   isActive: true
 *                   featuredAt: "2024-01-19T15:20:00.000Z"
 *                   featuredUntil: null
 *                   createdAt: "2024-01-19T15:20:00.000Z"
 *                   updatedAt: "2024-01-19T15:20:00.000Z"
 *                 - id: "featured_789ghi"
 *                   itemSlug: "useful-utility"
 *                   itemName: "Useful Utility"
 *                   itemDescription: "A handy utility for everyday tasks"
 *                   itemIconUrl: "https://example.com/icons/utility.png"
 *                   itemImageUrl: null
 *                   featuredOrder: 5
 *                   isActive: true
 *                   featuredAt: "2024-01-18T09:15:00.000Z"
 *                   featuredUntil: "2024-03-18T09:15:00.000Z"
 *                   createdAt: "2024-01-18T09:15:00.000Z"
 *                   updatedAt: "2024-01-18T09:15:00.000Z"
 *               count: 3
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
 *                   example: "Failed to fetch featured items"
 */
export async function GET(request: NextRequest) {
	try {
		// Check database availability
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) {
			return NextResponse.json({ success: true, data: [], count: 0 });
		}

		const { searchParams } = new URL(request.url);
		const rawLimit = Number.parseInt(searchParams.get('limit') ?? '6', 10);
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 6;
		const includeExpired = searchParams.get('includeExpired') === 'true';

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: true, data: [], count: 0 });
		}

		// Build query conditions for active featured items
		const conditions = [eq(featuredItems.isActive, true), eq(featuredItems.tenantId, tenantId)];

		// If not including expired, filter out items past their featured_until date
		if (!includeExpired) {
			const currentDate = new Date();
			const expirationCondition = or(
				isNull(featuredItems.featuredUntil),
				gte(featuredItems.featuredUntil, currentDate)
			);

			if (expirationCondition) {
				conditions.push(expirationCondition);
			}
		}

		// Get featured items
		const featuredItemsList = await db
			.select()
			.from(featuredItems)
			.where(and(...conditions))
			.orderBy(desc(featuredItems.featuredOrder), desc(featuredItems.featuredAt))
			.limit(limit);

		return NextResponse.json({
			success: true,
			data: featuredItemsList,
			count: featuredItemsList.length
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('Falling back to empty featured items:', error);
		}
		return NextResponse.json({ success: true, data: [], count: 0 });
	}
}
