import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';

/**
 * @swagger
 * /api/sponsor-ads/user/{id}:
 *   get:
 *     tags: ["Sponsor Ads - User"]
 *     summary: "Get single sponsor ad by ID"
 *     description: "Returns a single sponsor ad owned by the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Sponsor ad ID"
 *     responses:
 *       200:
 *         description: "Sponsor ad retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Sponsor ad not found"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const sponsorAd = await sponsorAdService.getSponsorAdById(id);

		if (!sponsorAd) {
			return NextResponse.json({ success: false, error: 'Sponsor ad not found' }, { status: 404 });
		}

		// Verify ownership
		if (sponsorAd.userId !== session.user.id) {
			return NextResponse.json({ success: false, error: 'Sponsor ad not found' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			data: sponsorAd
		});
	} catch (error) {
		console.error('Error fetching sponsor ad:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch sponsor ad' },
			{ status: 500 }
		);
	}
}
