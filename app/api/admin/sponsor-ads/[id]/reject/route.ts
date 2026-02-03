import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { rejectSponsorAdSchema } from '@/lib/validations/sponsor-ad';
import { getDefaultTenantId } from '@/lib/db/tenant';

/**
 * @swagger
 * /api/admin/sponsor-ads/{id}/reject:
 *   post:
 *     tags: ["Admin - Sponsor Ads"]
 *     summary: "Reject sponsor ad"
 *     description: "Rejects a pending sponsor ad submission with a reason. Only pending ads can be rejected. Requires admin authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Sponsor ad ID to reject"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: "Reason for rejection (minimum 10 characters)"
 *             required:
 *               - rejectionReason
 *     responses:
 *       200:
 *         description: "Sponsor ad rejected successfully"
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
 *                   example: "Sponsor ad rejected successfully"
 *       400:
 *         description: "Bad request - Invalid input or cannot reject ad with current status"
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

		if (!session?.user?.isAdmin || !session.user.id) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const body = await request.json().catch(() => ({}));

		// Validate request body
		const validationResult = rejectSponsorAdSchema.safeParse({
			id,
			rejectionReason: body.rejectionReason
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

		const sponsorAd = await sponsorAdService.rejectSponsorAd(
			id,
			session.user.id,
			validationResult.data.rejectionReason,
			tenantId
		);

		if (!sponsorAd) {
			return NextResponse.json({ success: false, error: 'Failed to reject sponsor ad' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			data: sponsorAd,
			message: 'Sponsor ad rejected successfully'
		});
	} catch (error) {
		console.error('Error rejecting sponsor ad:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to reject sponsor ad';

		// Handle expected validation errors (400) - keep specific message
		if (errorMessage.includes('Cannot reject')) {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
		}

		// Handle expected not found errors (404) - keep specific message
		if (errorMessage === 'Sponsor ad not found') {
			return NextResponse.json({ success: false, error: errorMessage }, { status: 404 });
		}

		// Use generic message for unexpected errors (500) to avoid exposing sensitive details
		return NextResponse.json({ success: false, error: 'Failed to reject sponsor ad' }, { status: 500 });
	}
}
