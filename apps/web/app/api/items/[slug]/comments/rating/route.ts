import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { comments } from '@/lib/db/schema';
import { and, avg, count, isNull, eq } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { getItemIdFromSlug } from '@/lib/db/queries/item.queries';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * @swagger
 * /api/items/{slug}/comments/rating:
 *   get:
 *     tags: ["Item Comments"]
 *     summary: "Get item rating statistics"
 *     description: "Returns aggregated rating statistics for a specific item including average rating and total number of ratings. Only counts non-deleted comments. This is a public endpoint that doesn't require authentication and includes database availability checking."
 *     parameters:
 *       - name: "slug"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item slug to get rating statistics for"
 *         example: "awesome-productivity-tool"
 *     responses:
 *       200:
 *         description: "Rating statistics retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averageRating:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 5
 *                   description: "Average rating (0 if no ratings)"
 *                   example: 4.2
 *                 totalRatings:
 *                   type: integer
 *                   minimum: 0
 *                   description: "Total number of ratings"
 *                   example: 15
 *               required: ["averageRating", "totalRatings"]
 *             examples:
 *               with_ratings:
 *                 summary: "Item with ratings"
 *                 value:
 *                   averageRating: 4.2
 *                   totalRatings: 15
 *               no_ratings:
 *                 summary: "Item with no ratings"
 *                 value:
 *                   averageRating: 0
 *                   totalRatings: 0
 *       500:
 *         description: "Internal server error or database unavailable"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch ratings"
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		// Public item detail should degrade quietly when DB-backed ratings are unavailable.
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) {
			return NextResponse.json({ averageRating: 0, totalRatings: 0 });
		}

		const { slug } = await params;
		const itemId = getItemIdFromSlug(slug);

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ averageRating: 0, totalRatings: 0 });
		}

		const result = await db
			.select({
				averageRating: avg(comments.rating).as('averageRating'),
				totalRatings: count().as('totalRatings')
			})
			.from(comments)
			.where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt), eq(comments.tenantId, tenantId)));

		const { averageRating, totalRatings } = result[0];

		return NextResponse.json({
			averageRating: Number(averageRating) || 0,
			totalRatings: Number(totalRatings) || 0
		});
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('Falling back to zero ratings:', error);
		}
		return NextResponse.json({ averageRating: 0, totalRatings: 0 });
	}
}
