import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { cancelSponsorAdSchema } from '@/lib/validations/sponsor-ad';

/**
 * @swagger
 * /api/sponsor-ads/user/{id}/cancel:
 *   post:
 *     tags: ["Sponsor Ads - User"]
 *     summary: "Cancel user's sponsor ad"
 *     description: "Cancels a sponsor ad owned by the authenticated user. Can only cancel pending_payment, pending, or active ads."
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
 *                 description: "Optional reason for cancellation"
 *     responses:
 *       200:
 *         description: "Sponsor ad cancelled successfully"
 *       400:
 *         description: "Bad request - Cannot cancel ad with current status"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - User does not own this sponsor ad"
 *       404:
 *         description: "Sponsor ad not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		// Parse and validate optional body for cancel reason using Zod schema
		// Guard against JSON null: if client sends null, we coalesce to {}
		const body = (await request.json().catch(() => ({}))) ?? {};
		const parsed = cancelSponsorAdSchema.omit({ id: true }).safeParse(body);

		// If validation fails and cancelReason was provided, return 400 error
		// This handles cases like cancelReason exceeding 500 character limit
		if (!parsed.success && body.cancelReason !== undefined) {
			const errorMessage = parsed.error.issues[0]?.message || 'Invalid cancel reason';
			return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
		}

		const cancelReason =
			parsed.success && parsed.data.cancelReason?.trim() ? parsed.data.cancelReason.trim() : 'Cancelled by user';

		// Get the sponsor ad to verify ownership
		const sponsorAd = await sponsorAdService.getSponsorAdById(id);

		if (!sponsorAd) {
			return NextResponse.json({ success: false, error: 'Sponsor ad not found' }, { status: 404 });
		}

		// Verify ownership
		if (sponsorAd.userId !== session.user.id) {
			return NextResponse.json(
				{ success: false, error: 'You do not have permission to cancel this sponsor ad' },
				{ status: 403 }
			);
		}

		// Cancel the sponsor ad
		const cancelledAd = await sponsorAdService.cancelSponsorAd(id, cancelReason);

		if (!cancelledAd) {
			return NextResponse.json({ success: false, error: 'Failed to cancel sponsor ad' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			data: cancelledAd,
			message: 'Sponsor ad cancelled successfully'
		});
	} catch (error) {
		console.error('Error cancelling sponsor ad:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to cancel sponsor ad';

		// Handle expected not found errors (404) - keep specific message
		if (errorMessage === 'Sponsor ad not found') {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 404 });
		}

		// Handle expected validation errors (400) - keep specific message
		if (errorMessage.includes('Cannot cancel')) {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
		}

		// Use generic message for unexpected errors (500) to avoid exposing sensitive details
		return NextResponse.json(
			{ success: false, error: 'An error occurred while cancelling the sponsor ad' },
			{ status: 500 }
		);
	}
}
