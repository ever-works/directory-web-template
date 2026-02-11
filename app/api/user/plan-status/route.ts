/**
 * User Plan Status API
 *
 * Returns comprehensive plan status information including expiration details.
 * Used by frontend to display plan warnings and gate features.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/services/subscription.service';
import { safeErrorMessage } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/user/plan-status:
 *   get:
 *     summary: Get user's plan status with expiration info
 *     description: |
 *       Returns the user's current plan with full expiration details.
 *       Includes effective plan (what the user can actually access),
 *       expiration warnings, and feature access status.
 *     tags:
 *       - User
 *       - Subscription
 *     security:
 *       - session: []
 *     responses:
 *       200:
 *         description: Successfully retrieved plan status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     planId:
 *                       type: string
 *                       description: The user's subscribed plan ID
 *                       enum: [free, standard, premium]
 *                     effectivePlan:
 *                       type: string
 *                       description: The plan the user can actually access (may differ if expired)
 *                       enum: [free, standard, premium]
 *                     isExpired:
 *                       type: boolean
 *                       description: Whether the subscription has expired
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Subscription expiration date
 *                     daysUntilExpiration:
 *                       type: integer
 *                       nullable: true
 *                       description: Days until expiration (negative if already expired)
 *                     isInWarningPeriod:
 *                       type: boolean
 *                       description: Whether subscription expires within 7 days
 *                     canAccessPlanFeatures:
 *                       type: boolean
 *                       description: Whether user can access their plan's features
 *                     warningMessage:
 *                       type: string
 *                       nullable: true
 *                       description: User-facing warning message if applicable
 *                     status:
 *                       type: string
 *                       nullable: true
 *                       description: Raw subscription status
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
	try {
		// Verify authentication
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		// Get comprehensive plan status
		const planStatus = await subscriptionService.getUserPlanWithExpiration(session.user.id);

		return NextResponse.json({
			success: true,
			data: {
				planId: planStatus.planId,
				effectivePlan: planStatus.effectivePlan,
				isExpired: planStatus.isExpired,
				expiresAt: planStatus.expiresAt?.toISOString() || null,
				daysUntilExpiration: planStatus.daysUntilExpiration,
				isInWarningPeriod: planStatus.isInWarningPeriod,
				canAccessPlanFeatures: planStatus.canAccessPlanFeatures,
				warningMessage: planStatus.warningMessage,
				status: planStatus.status
			}
		});
	} catch (error) {
		console.error('[PlanStatus] Error getting plan status:', error);

		return NextResponse.json(
			{
				success: false,
				message: 'Failed to get plan status',
				error: safeErrorMessage(error, 'Unknown error')
			},
			{ status: 500 }
		);
	}
}
