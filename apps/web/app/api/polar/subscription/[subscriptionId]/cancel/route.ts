import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreatePolarProvider } from '@/lib/auth';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { getPolarSubscription } from '@/lib/payment/lib/utils/polar-subscription-helpers';

/**
 * @swagger
 * /api/polar/subscription/{subscriptionId}/cancel:
 *   post:
 *     tags: ["Polar - Subscriptions"]
 *     summary: "Cancel subscription by ID"
 *     description: "Cancels a specific Polar subscription with comprehensive database synchronization and automatic email notifications. Supports both immediate and end-of-period cancellation with detailed response metadata."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "subscriptionId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Polar subscription ID to cancel"
 *         example: "sub_1234567890abcdef"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: true
 *                 description: "Whether to cancel at period end (true) or immediately (false)"
 *                 example: true
 *     responses:
 *       200:
 *         description: "Subscription cancelled successfully"
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
 *                       enum: ["active", "canceled", "cancelled"]
 *                       example: "active"
 *                     cancelAtPeriodEnd:
 *                       type: boolean
 *                       description: "Whether subscription will cancel at period end"
 *                       example: true
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
 *                   examples:
 *                     period_end: "Subscription will be cancelled at the end of the current period"
 *                     immediate: "Subscription cancelled immediately"
 *               required: ["success", "data", "message"]
 *             examples:
 *               cancel_at_period_end:
 *                 summary: "Cancel at period end"
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "sub_1234567890abcdef"
 *                     status: "active"
 *                     cancelAtPeriodEnd: true
 *                     currentPeriodEnd: 1643673600
 *                     priceId: "prod_1234567890abcdef"
 *                     customerId: "cus_1234567890abcdef"
 *                   message: "Subscription will be cancelled at the end of the current period"
 *               cancel_immediately:
 *                 summary: "Cancel immediately"
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "sub_1234567890abcdef"
 *                     status: "canceled"
 *                     cancelAtPeriodEnd: false
 *                     currentPeriodEnd: 1643673600
 *                     priceId: "prod_1234567890abcdef"
 *                     customerId: "cus_1234567890abcdef"
 *                   message: "Subscription cancelled immediately"
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
 *         description: "Not found - Subscription not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Subscription not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to cancel subscription"
 *     x-email-notification:
 *       description: "Automatic email notification sent to customer"
 *       template: "subscription_cancellation"
 *       data:
 *         - customerName: "Customer display name"
 *         - customerEmail: "Customer email address"
 *         - planName: "Subscription plan name"
 *         - subscriptionId: "Polar subscription ID"
 *         - cancelAtPeriodEnd: "Cancellation timing"
 *         - currentPeriodEnd: "End of current period"
 *         - reactivateUrl: "URL to reactivate subscription"
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

		// Parse request body for cancelAtPeriodEnd option (defaults to true)
		let cancelAtPeriodEnd = true;
		
		// SECURITY: Check Content-Length to prevent body size limit errors
		// This endpoint only expects a small JSON object (max 1KB is more than enough)
		const contentLength = request.headers.get('content-length');
		if (contentLength) {
			const sizeInBytes = parseInt(contentLength, 10);
			const maxSize = 1024; // 1KB limit for this endpoint
			if (sizeInBytes > maxSize) {
				return NextResponse.json(
					{ error: `Request body too large. Maximum size is ${maxSize} bytes.` },
					{ status: 413 }
				);
			}
		}
		
		try {
			const body = await request.json();
			if (typeof body.cancelAtPeriodEnd === 'boolean') {
				cancelAtPeriodEnd = body.cancelAtPeriodEnd;
			}
		} catch (error) {
			// Handle body size limit errors specifically
			if (error instanceof Error && (
				error.message.includes('exceeded') || 
				error.message.includes('too large') ||
				error.message.includes('75000')
			)) {
				return NextResponse.json(
					{ error: 'Request body too large' },
					{ status: 413 }
				);
			}
			// No body provided or invalid JSON, use default (cancelAtPeriodEnd = true)
		}

		const { subscriptionId } = await params;

		// Get or create Polar provider
		const polarProvider = getOrCreatePolarProvider();

		// SECURITY: Verify subscription ownership before cancellation (IDOR protection)
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

		// Cancel subscription via Polar API (ownership verified)
		const cancelledSubscription = await polarProvider.cancelSubscription(
			subscriptionId,
			cancelAtPeriodEnd
		);

		return NextResponse.json({
			success: true,
			data: {
				id: cancelledSubscription.id,
				status: cancelledSubscription.status,
				cancelAtPeriodEnd: cancelledSubscription.cancelAtPeriodEnd,
				currentPeriodEnd: cancelledSubscription.currentPeriodEnd,
				priceId: cancelledSubscription.priceId,
				customerId: cancelledSubscription.customerId
			},
			message: cancelAtPeriodEnd
				? 'Subscription will be cancelled at the end of the current period'
				: 'Subscription cancelled immediately'
		});
	} catch (error) {
		let statusCode = 500;
		let fallbackMessage = 'Failed to cancel subscription';

		if (error instanceof Error) {
			if (error.message.includes('not found') || error.message.includes('404')) {
				statusCode = 404;
				fallbackMessage = 'Subscription not found';
			} else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
				statusCode = 401;
				fallbackMessage = 'Unauthorized';
			}
		}

		return safeErrorResponse(error, fallbackMessage, statusCode);
	}
}

