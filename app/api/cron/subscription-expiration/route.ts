/**
 * Subscription Expiration Cron Job
 *
 * This endpoint processes expired subscriptions by:
 * 1. Finding active subscriptions past their end date
 * 2. Updating their status to 'expired'
 * 3. Logging the status changes
 * 4. Optionally sending notification emails
 *
 * Should be called daily by Vercel cron or external scheduler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/services/subscription.service';
import { getUserById } from '@/lib/db/queries/user.queries';
import { getSubscriptionExpiredTemplate } from '@/lib/mail/templates/subscription-expired';
import { createEmailService, sendEmailSafely } from '@/lib/newsletter/utils';
import { PaymentPlan } from '@/lib/constants';
import crypto from 'crypto';

/**
 * Verify cron secret with timing-safe comparison
 * Allows unauthenticated access only in development mode
 * Requires CRON_SECRET in production
 */
function verifyCronSecret(request: NextRequest): boolean {
	const authHeader = request.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	// If no CRON_SECRET is set, allow in development only
	if (!cronSecret) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('[SubscriptionExpiration] CRON_SECRET not configured - allowing in development mode only');
			return true;
		}
		// In production, require CRON_SECRET to be configured
		console.error('[SubscriptionExpiration] CRON_SECRET not configured in production - denying access');
		return false;
	}

	if (!authHeader) {
		return false;
	}

	const providedSecret = authHeader.replace('Bearer ', '');

	// Use timing-safe comparison to prevent timing attacks
	// Both strings must have the same length for timingSafeEqual
	if (providedSecret.length !== cronSecret.length) {
		return false;
	}

	// Use crypto.timingSafeEqual for constant-time comparison
	return crypto.timingSafeEqual(Buffer.from(providedSecret, 'utf8'), Buffer.from(cronSecret, 'utf8'));
}

/**
 * @swagger
 * /api/cron/subscription-expiration:
 *   get:
 *     summary: Process expired subscriptions
 *     description: |
 *       Cron job endpoint that finds and processes expired subscriptions.
 *       Updates status from 'active' to 'expired' for subscriptions past their end date.
 *       Should be called daily.
 *     tags:
 *       - Cron Jobs
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Successfully processed expired subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     processed:
 *                       type: integer
 *                       description: Number of subscriptions updated
 *                     affectedUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subscriptionId:
 *                             type: string
 *                           userId:
 *                             type: string
 *                           planId:
 *                             type: string
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized - Invalid or missing cron secret
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
	try {
		// Verify cron secret - required in production, optional in development
		if (!verifyCronSecret(request)) {
			console.warn('[SubscriptionExpiration] Unauthorized cron request');
			return NextResponse.json(
				{
					success: false,
					message: 'Unauthorized - Invalid or missing cron secret'
				},
				{ status: 401 }
			);
		}

		console.log('[SubscriptionExpiration] Starting expired subscription processing...');

		// Process expired subscriptions
		const result = await subscriptionService.processExpiredSubscriptions();

		// Collect affected user information (without PII like email)
		// Email notifications should be handled internally, not exposed in API responses
		const affectedUsers: Array<{
			subscriptionId: string;
			userId: string;
			planId: string;
		}> = result.subscriptions.map((subscription) => ({
			subscriptionId: subscription.id,
			userId: subscription.userId,
			planId: subscription.planId
		}));

		// Send notification emails to affected users
		try {
			const { service: emailService, config: emailConfig } = await createEmailService();

			if (emailService.isServiceAvailable()) {
				for (const subscription of result.subscriptions) {
					try {
						const user = await getUserById(subscription.userId, subscription.tenantId);
						if (!user?.email) {
							console.warn(`[SubscriptionExpiration] No email found for user ${subscription.userId}`);
							continue;
						}

						const planNames: Record<string, string> = {
							[PaymentPlan.FREE]: 'Free Plan',
							[PaymentPlan.STANDARD]: 'Standard Plan',
							[PaymentPlan.PREMIUM]: 'Premium Plan'
						};

						const emailTemplate = getSubscriptionExpiredTemplate({
							customerName: 'Valued Customer',
							customerEmail: user.email,
							planName: planNames[subscription.planId] || subscription.planId,
							amount: subscription.amount ? (subscription.amount / 100).toFixed(2) : '0.00',
							currency: subscription.currency || 'usd',
							billingPeriod: subscription.interval || 'month',
							subscriptionId: subscription.id,
							expirationDate:
								subscription.endDate?.toLocaleDateString() || new Date().toLocaleDateString(),
							renewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ever.works'}/client/settings/profile/billing`
						});

						const emailResult = await sendEmailSafely(
							emailService,
							emailConfig,
							emailTemplate,
							user.email,
							'subscription expiration'
						);

						if (emailResult.success) {
							console.log(
								`[SubscriptionExpiration] Expiration email sent to user ${subscription.userId}`
							);
						} else {
							result.errors.push(
								`Failed to send expiration email for subscription ${subscription.id}: ${emailResult.error}`
							);
						}
					} catch (error) {
						const errorMsg = `Failed to send expiration email for subscription ${subscription.id}: ${error}`;
						console.error(`[SubscriptionExpiration] ${errorMsg}`);
						result.errors.push(errorMsg);
					}
				}
			} else {
				console.warn('[SubscriptionExpiration] Email service not available - skipping email notifications');
			}
		} catch (error) {
			console.warn('[SubscriptionExpiration] Failed to initialize email service:', error);
			// Don't fail the cron job if email service fails
		}

		// Log summary
		console.log(`[SubscriptionExpiration] Completed: ${result.processed} subscriptions expired`);
		if (result.errors.length > 0) {
			console.warn('[SubscriptionExpiration] Errors:', result.errors);
		}

		return NextResponse.json({
			success: true,
			message: `Processed ${result.processed} expired subscriptions`,
			data: {
				processed: result.processed,
				affectedUsers,
				errors: result.errors,
				timestamp: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('[SubscriptionExpiration] Error processing expired subscriptions:', error);

		return NextResponse.json(
			{
				success: false,
				message: 'Failed to process expired subscriptions',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
	return GET(request);
}
