import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreatePolarProvider } from '@/lib/auth';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { getPolarSubscription } from '@/lib/payment/lib/utils/polar-subscription-helpers';

/**
 * @swagger
 * /api/polar/subscription/{subscriptionId}/reactivate:
 *   post:
 *     tags: ["Polar - Subscriptions"]
 *     summary: "Reactivate cancelled subscription"
 *     description: "Reactivates a Polar subscription that was scheduled for cancellation at period end. Includes ownership verification, database synchronization, and automatic email notifications. Only works for subscriptions with cancelAtPeriodEnd=true."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "subscriptionId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Polar subscription ID to reactivate"
 *         example: "sub_1234567890abcdef"
 *     responses:
 *       200:
 *         description: "Subscription reactivated successfully"
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
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Polar subscription ID"
 *                       example: "sub_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       enum: ["active", "trialing"]
 *                       example: "active"
 *                     cancelAtPeriodEnd:
 *                       type: boolean
 *                       description: "Whether subscription will cancel at period end (should be false after reactivation)"
 *                       example: false
 *                     currentPeriodEnd:
 *                       type: integer
 *                       nullable: true
 *                       description: "Unix timestamp of current period end"
 *                       example: 1643673600
 *                     priceId:
 *                       type: string
 *                       description: "Polar price/product ID"
 *                       example: "prod_1234567890abcdef"
 *                     customerId:
 *                       type: string
 *                       description: "Polar customer ID"
 *                       example: "cus_1234567890abcdef"
 *                   required: ["id", "status", "cancelAtPeriodEnd"]
 *                 message:
 *                   type: string
 *                   example: "Subscription reactivated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "sub_1234567890abcdef"
 *                 status: "active"
 *                 cancelAtPeriodEnd: false
 *                 currentPeriodEnd: 1643673600
 *                 priceId: "prod_1234567890abcdef"
 *                 customerId: "cus_1234567890abcdef"
 *               message: "Subscription reactivated successfully"
 *       400:
 *         description: "Bad request - Subscription not scheduled for cancellation"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Subscription is not scheduled for cancellation"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: "Not found - Subscription not found or access denied"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Subscription not found or access denied"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to reactivate subscription"
 *     x-email-notification:
 *       description: "Automatic email notification sent to customer"
 *       template: "subscription_reactivated"
 *       data:
 *         - customerName: "Customer display name"
 *         - customerEmail: "Customer email address"
 *         - planName: "Subscription plan name"
 *         - subscriptionId: "Polar subscription ID"
 *         - manageSubscriptionUrl: "URL to manage subscription"
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ subscriptionId: string }> }
) {
	try {
		const session = await auth();

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { subscriptionId } = await params;

		// Get or create Polar provider
		const polarProvider = getOrCreatePolarProvider();

		// SECURITY: Verify subscription ownership before reactivation (IDOR protection)
		// Get the user's Polar customer ID
		const userPolarCustomerId = await polarProvider.getCustomerId(session.user as any);
		if (!userPolarCustomerId) {
			return NextResponse.json(
				{ error: 'Unable to verify subscription ownership. Please contact support.' },
				{ status: 403 }
			);
		}

		// Get the subscription to verify ownership
		// Access the internal polar client for direct subscription retrieval
		const polarClient = (polarProvider as any).polar;
		if (!polarClient) {
			return NextResponse.json(
				{ error: 'Internal error: Unable to verify subscription ownership' },
				{ status: 500 }
			);
		}

		try {
			const subscription = await getPolarSubscription(
				subscriptionId,
				polarClient,
				{
					formatErrorMessage: (error: unknown) => {
						if (error instanceof Error) return error.message;
						return String(error);
					},
					logger: {
						error: () => {},
						warn: () => {},
						info: () => {}
					}
				},
				'ownership verification'
			);
			
			// Extract customerId from subscription (handle different response formats)
			const subscriptionCustomerId = 
				(subscription as any)?.customer?.id || 
				(subscription as any)?.customerId || 
				'';
			
			// Verify that the subscription belongs to the authenticated user
			if (!subscriptionCustomerId || subscriptionCustomerId !== userPolarCustomerId) {
				return NextResponse.json(
					{ error: 'Subscription not found or access denied' },
					{ status: 404 }
				);
			}
		} catch (error) {
			// If subscription doesn't exist or can't be retrieved, return 404
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('not found') || errorMessage.includes('404')) {
				return NextResponse.json(
					{ error: 'Subscription not found or access denied' },
					{ status: 404 }
				);
			}
			// For other errors, rethrow to be handled by outer catch
			throw error;
		}

		// Reactivate the subscription in Polar (ownership verified)
		const reactivatedSubscription = await polarProvider.reactivateSubscription(subscriptionId);
		return NextResponse.json({
			success: true,
			data: {
				id: reactivatedSubscription.id,
				status: reactivatedSubscription.status,
				cancelAtPeriodEnd: reactivatedSubscription.cancelAtPeriodEnd,
				currentPeriodEnd: reactivatedSubscription.currentPeriodEnd,
				priceId: reactivatedSubscription.priceId,
				customerId: reactivatedSubscription.customerId
			},
			message: 'Subscription reactivated successfully'
		});
	} catch (error) {
		let statusCode = 500;
		let fallbackMessage = 'Failed to reactivate subscription';

		if (error instanceof Error) {
			if (error.message.includes('not found') || error.message.includes('404')) {
				statusCode = 404;
				fallbackMessage = 'Subscription not found';
			} else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
				statusCode = 401;
				fallbackMessage = 'Unauthorized';
			} else if (error.message.includes('not scheduled for cancellation')) {
				statusCode = 400;
				fallbackMessage = 'Subscription is not scheduled for cancellation';
			}
		}

		return safeErrorResponse(error, fallbackMessage, statusCode);
	}
}

