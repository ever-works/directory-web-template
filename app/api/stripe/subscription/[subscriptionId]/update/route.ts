import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PaymentPlan } from '@/lib/constants';
import { getSubscriptionByProviderSubscriptionId } from '@/lib/db/queries';
import { paymentEmailService } from '@/lib/payment/services/payment-email.service';

/**
 * @swagger
 * /api/stripe/subscription/{subscriptionId}/update:
 *   post:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Update subscription plan"
 *     description: "Updates a subscription to a new plan with comprehensive validation, ownership verification, database synchronization, and automatic email notifications. Includes plan validation and subscription status checks."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "subscriptionId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe subscription ID to update"
 *         example: "sub_1234567890abcdef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 description: "New plan ID (must be valid PaymentPlan)"
 *                 example: "pro"
 *               newPriceId:
 *                 type: string
 *                 description: "New Stripe price ID"
 *                 example: "price_0987654321fedcba"
 *             required: ["newPlanId", "newPriceId"]
 *     responses:
 *       200:
 *         description: "Subscription plan updated successfully"
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
 *                       description: "Stripe subscription ID"
 *                       example: "sub_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       enum: ["active", "trialing", "past_due"]
 *                       example: "active"
 *                     customer:
 *                       type: string
 *                       description: "Stripe customer ID"
 *                       example: "cus_1234567890abcdef"
 *                     current_period_start:
 *                       type: integer
 *                       description: "Unix timestamp of current period start"
 *                       example: 1640995200
 *                     current_period_end:
 *                       type: integer
 *                       description: "Unix timestamp of current period end"
 *                       example: 1643673600
 *                     items:
 *                       type: object
 *                       description: "Subscription items with new price"
 *                       properties:
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               price:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     example: "price_0987654321fedcba"
 *                   required: ["id", "status", "customer", "current_period_start", "current_period_end"]
 *                 message:
 *                   type: string
 *                   example: "Plan updated to pro successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "sub_1234567890abcdef"
 *                 status: "active"
 *                 customer: "cus_1234567890abcdef"
 *                 current_period_start: 1640995200
 *                 current_period_end: 1643673600
 *                 items:
 *                   data:
 *                     - price:
 *                         id: "price_0987654321fedcba"
 *               message: "Plan updated to pro successfully"
 *       400:
 *         description: "Bad request - Invalid plan ID or subscription not active"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     invalid_plan: "Invalid plan ID"
 *                     not_active: "Subscription is not active"
 *             examples:
 *               invalid_plan:
 *                 summary: "Invalid plan ID"
 *                 value:
 *                   error: "Invalid plan ID"
 *               not_active:
 *                 summary: "Subscription not active"
 *                 value:
 *                   error: "Subscription is not active"
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
 *                   example: "Failed to update subscription"
 *     x-email-notification:
 *       description: "Automatic email notification sent to customer"
 *       template: "subscription_plan_changed"
 *       data:
 *         - customerName: "Customer display name"
 *         - customerEmail: "Customer email address"
 *         - oldPlanName: "Previous plan name"
 *         - newPlanName: "New plan name"
 *         - subscriptionId: "Stripe subscription ID"
 *         - manageSubscriptionUrl: "URL to manage subscription"
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ subscriptionId: string }> }) {
	try {
		const session = await auth();

		if (!session?.user || !session.user.tenantId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { newPlanId, newPriceId } = await request.json();
		const { subscriptionId } = await params;

		// Validate the new plan
		if (!Object.values(PaymentPlan).includes(newPlanId)) {
			return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
		}

		const stripeProvider = getOrCreateStripeProvider();
		// Verify the subscription belongs to the user
		const userSubscription = await getSubscriptionByProviderSubscriptionId(
			'stripe',
			subscriptionId,
			session.user.tenantId
		);

		if (!userSubscription) {
			return NextResponse.json({ error: 'Subscription not found or access denied' }, { status: 404 });
		}

		const subscription = userSubscription;

		// Check if subscription is active
		if (subscription.status !== 'active' && subscription.status !== 'pending' && subscription.status !== 'paused') {
			return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 });
		}

		// Update the subscription in Stripe
		const updatedSubscription = await stripeProvider.updateSubscription({
			subscriptionId,
			priceId: newPriceId
		});

		// Update the subscription in the database
		await db
			.update(subscriptions)
			.set({
				planId: newPlanId,
				priceId: newPriceId,
				updatedAt: new Date()
			})
			.where(eq(subscriptions.subscriptionId, subscriptionId));

		const appUrl =
			process.env.NEXT_PUBLIC_APP_URL ??
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');

		// Send plan change email
		try {
			const emailData = {
				customerName: session.user.name || session.user.email || 'User',
				customerEmail: session.user.email!,
				oldPlanName: subscription.planId,
				newPlanName: newPlanId,
				subscriptionId: subscriptionId,
				companyName: 'Ever Works',
				companyUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ever.works',
				supportEmail: process.env.EMAIL_SUPPORT || 'support@ever.works',
				manageSubscriptionUrl: `${appUrl || ''}/settings/billing`
			};

			await paymentEmailService.sendSubscriptionPlanChangedEmail(emailData);
		} catch (emailError) {
			console.error('Failed to send plan change email:', emailError);
			// Don't fail the request if email fails
		}

		return NextResponse.json({
			success: true,
			data: updatedSubscription,
			message: `Plan updated to ${newPlanId} successfully`
		});
	} catch (error) {
		console.error('Error updating subscription:', error);
		return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
	}
}
