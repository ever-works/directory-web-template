import { NextRequest, NextResponse } from 'next/server';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';

/**
 * @swagger
 * /api/sponsor-ads:
 *   get:
 *     tags: ["Sponsor Ads"]
 *     summary: "Get active sponsor ads with item data"
 *     description: "Returns a list of currently active sponsor ads with their associated item data for public display. No authentication required."
 *     parameters:
 *       - name: "limit"
 *         in: "query"
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: "Maximum number of sponsor ads to return"
 *     responses:
 *       200:
 *         description: "Active sponsor ads retrieved successfully"
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
 *                       sponsor:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           itemSlug:
 *                             type: string
 *                           status:
 *                             type: string
 *                           interval:
 *                             type: string
 *                       item:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           name:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           description:
 *                             type: string
 *                           icon_url:
 *                             type: string
 *                           category:
 *                             type: string
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limitParam = searchParams.get('limit');
		// Validate limit parameter: must be a finite number, at least 1, and at most 50
		const rawLimit = limitParam ? Number(limitParam) : 10;
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), 50) : 10;

		// Get active sponsor ads with item data
		const sponsorAds = await sponsorAdService.getActiveSponsorAdsWithItems(limit);

		return NextResponse.json({
			success: true,
			data: sponsorAds
		});
	} catch (error) {
		console.error('Error fetching active sponsor ads:', error);
		return NextResponse.json({ success: false, error: 'Failed to fetch sponsor ads' }, { status: 500 });
	}
}
