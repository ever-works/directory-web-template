import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sponsorAdService } from "@/lib/services/sponsor-ad.service";
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/admin/sponsor-ads/{id}/approve:
 *   post:
 *     tags: ["Admin - Sponsor Ads"]
 *     summary: "Approve and activate sponsor ad"
 *     description: "Approves and activates a sponsor ad. For pending_payment status, use forceApprove=true. Requires admin authentication."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Sponsor ad ID to approve"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forceApprove:
 *                 type: boolean
 *                 description: "Set to true to approve without payment"
 *     responses:
 *       200:
 *         description: "Sponsor ad approved and activated successfully"
 *       400:
 *         description: "Bad request - Payment not received (use forceApprove)"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Sponsor ad not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin || !session.user.id) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized. Admin access required." },
				{ status: 401 }
			);
		}

		const { id } = await params;

		// Parse request body for forceApprove flag
		let forceApprove = false;
		try {
			const body = await request.json();
			forceApprove = body.forceApprove === true;
		} catch {
			// No body or invalid JSON, proceed without force approve
		}

		const sponsorAd = await sponsorAdService.approveSponsorAd(
			id,
			session.user.id,
			forceApprove
		);

		if (!sponsorAd) {
			return NextResponse.json(
				{ success: false, error: "Failed to approve sponsor ad" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			data: sponsorAd,
			message: "Sponsor ad approved and activated successfully",
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Sponsor ad not found") {
			return NextResponse.json(
				{ success: false, error: "Sponsor ad not found" },
				{ status: 404 }
			);
		}

		// Special case for payment not received - return specific error code
		if (error instanceof Error && error.message === "PAYMENT_NOT_RECEIVED") {
			return NextResponse.json(
				{ success: false, error: "PAYMENT_NOT_RECEIVED" },
				{ status: 400 }
			);
		}

		if (error instanceof Error && error.message.includes("Cannot approve")) {
			return NextResponse.json(
				{ success: false, error: error.message },
				{ status: 400 }
			);
		}

		return safeErrorResponse(error, "Failed to approve sponsor ad");
	}
}
