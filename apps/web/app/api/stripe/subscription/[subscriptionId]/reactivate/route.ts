import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import { getSubscriptionByProviderSubscriptionId, updateSubscriptionBySubscriptionId } from '@/lib/db/queries';
import { paymentEmailService } from '@/lib/payment/services/payment-email.service';

/**
 * @swagger
 * /api/stripe/subscription/{subscriptionId}/reactivate:
 *   post:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Reactivate cancelled subscription"
 *     description: "Reactivates a subscription that was scheduled for cancellation at period end. Includes ownership verification, database synchronization, and automatic email notifications. Only works for subscriptions with cancelAtPeriodEnd=true."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "subscriptionId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe subscription ID to reactivate"
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
 *                       description: "Stripe subscription ID"
 *                       example: "sub_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       enum: ["active", "trialing"]
 *                       example: "active"
 *                     cancel_at_period_end:
 *                       type: boolean
 *                       description: "Whether subscription will cancel at period end (should be false after reactivation)"
 *                       example: false
 *                     canceled_at:
 *                       type: integer
 *                       nullable: true
 *                       description: "Unix timestamp when subscription was cancelled (should be null after reactivation)"
 *                       example: null
 *                     current_period_start:
 *                       type: integer
 *                       description: "Unix timestamp of current period start"
 *                       example: 1640995200
 *                     current_period_end:
 *                       type: integer
 *                       description: "Unix timestamp of current period end"
 *                       example: 1643673600
 *                   required: ["id", "status", "cancel_at_period_end", "current_period_start", "current_period_end"]
 *                 message:
 *                   type: string
 *                   example: "Subscription reactivated successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "sub_1234567890abcdef"
 *                 status: "active"
 *                 cancel_at_period_end: false
 *                 canceled_at: null
 *                 current_period_start: 1640995200
 *                 current_period_end: 1643673600
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
 *         - subscriptionId: "Stripe subscription ID"
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

    // Initialize Stripe provider
    const stripeProvider = getOrCreateStripeProvider();

    // Verify the subscription belongs to the user
    const userSubscription = await getSubscriptionByProviderSubscriptionId('stripe',subscriptionId);
    

    if (!userSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found or access denied' },
        { status: 404 }
      );
    }

    const subscription = userSubscription;

    // Check if subscription is actually cancelled
    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    // Reactivate the subscription in Stripe
    const reactivatedSubscription = await stripeProvider.updateSubscription({
      subscriptionId,
      cancelAtPeriodEnd: false
    });

    await updateSubscriptionBySubscriptionId({
      subscriptionId: subscriptionId,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      updatedAt: new Date(),
      status: 'active'
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");

    // Send reactivation email
    try {
      const emailData = {
        customerName: session.user.name || session.user.email || 'User',
        customerEmail: session.user.email!,
        planName: userSubscription?.planId || '',
        subscriptionId: subscriptionId,
        companyName: "Ever Works",
        companyUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ever.works",
        supportEmail: process.env.EMAIL_SUPPORT || "support@ever.works",
        manageSubscriptionUrl: `${appUrl || ''}/settings/billing`
      };

      await paymentEmailService.sendSubscriptionReactivatedEmail(emailData as any);
    } catch (emailError) {
      console.error('Failed to send reactivation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: reactivatedSubscription,
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
