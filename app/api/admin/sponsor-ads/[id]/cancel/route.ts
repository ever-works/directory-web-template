import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { cancelSponsorAdSchema } from '@/lib/validations/sponsor-ad';
import { getDefaultTenantId } from '@/lib/db/tenant';

/**
 * @swagger
 * /api/admin/sponsor-ads/{id}/cancel:
 *   post:
 *     tags: ["Admin - Sponsor Ads"]
 *     summary: "Cancel sponsor ad"
 *     description: "Cancels a sponsor ad. Can cancel pending, approved, or active ads. Requires admin authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Sponsor ad ID to cancel"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: "Optional reason for cancellation"
 *     responses:
 *       200:
 *         description: "Sponsor ad cancelled successfully"
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
 *                 message:
 *                   type: string
 *                   example: "Sponsor ad cancelled successfully"
 *       400:
 *         description: "Bad request - Cannot cancel ad with current status"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Sponsor ad not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const body = await request.json().catch(() => ({}));

		// Validate request body
		const validationResult = cancelSponsorAdSchema.safeParse({
			id,
			cancelReason: body.cancelReason
		});

		if (!validationResult.success) {
			return NextResponse.json(
				{
					success: false,
					error: validationResult.error.issues[0]?.message || 'Invalid request body'
				},
				{ status: 400 }
			);
		}

		const tenantId = session.user.tenantId || (await getDefaultTenantId());

		const sponsorAd = await sponsorAdService.cancelSponsorAd(id, tenantId, validationResult.data.cancelReason);

		if (!sponsorAd) {
			return NextResponse.json({ success: false, error: 'Failed to cancel sponsor ad' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			data: sponsorAd,
			message: 'Sponsor ad cancelled successfully'
		});
	} catch (error) {
		console.error('Error cancelling sponsor ad:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to cancel sponsor ad';

		if (errorMessage === 'Sponsor ad not found') {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 404 });
		}

		if (errorMessage.includes('Cannot cancel')) {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
		}

		return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
	}
}
