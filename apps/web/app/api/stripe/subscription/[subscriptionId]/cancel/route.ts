import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import { paymentEmailService } from '@/lib/payment/services/payment-email.service';
import { updateSubscriptionBySubscriptionId } from '@/lib/db/queries';

/**
 * @swagger
 * /api/stripe/subscription/{subscriptionId}/cancel:
 *   post:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Cancel subscription by ID"
 *     description: "Cancels a specific subscription with comprehensive database synchronization and automatic email notifications. Supports both immediate and end-of-period cancellation with detailed response metadata."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "subscriptionId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe subscription ID to cancel"
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
 *                       description: "Stripe subscription ID"
 *                       example: "sub_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       enum: ["active", "canceled"]
 *                       example: "active"
 *                     cancel_at_period_end:
 *                       type: boolean
 *                       description: "Whether subscription will cancel at period end"
 *                       example: true
 *                     canceled_at:
 *                       type: integer
 *                       nullable: true
 *                       description: "Unix timestamp when subscription was cancelled"
 *                       example: 1640995200
 *                     current_period_end:
 *                       type: integer
 *                       description: "Unix timestamp of current period end"
 *                       example: 1643673600
 *                     priceId:
 *                       type: string
 *                       description: "Stripe price ID"
 *                       example: "price_1234567890abcdef"
 *                     currentPeriodEnd:
 *                       type: integer
 *                       description: "Current period end timestamp"
 *                       example: 1643673600
 *                   required: ["id", "status", "cancel_at_period_end", "current_period_end"]
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
 *                     cancel_at_period_end: true
 *                     canceled_at: 1640995200
 *                     current_period_end: 1643673600
 *                     priceId: "price_1234567890abcdef"
 *                     currentPeriodEnd: 1643673600
 *                   message: "Subscription will be cancelled at the end of the current period"
 *               cancel_immediately:
 *                 summary: "Cancel immediately"
 *                 value:
 *                   success: true
 *                   data:
 *                     id: "sub_1234567890abcdef"
 *                     status: "canceled"
 *                     cancel_at_period_end: false
 *                     canceled_at: 1640995200
 *                     current_period_end: 1640995200
 *                     priceId: "price_1234567890abcdef"
 *                     currentPeriodEnd: 1640995200
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
 *         - subscriptionId: "Stripe subscription ID"
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

    const { cancelAtPeriodEnd = true } = await request.json();
    const { subscriptionId } = await params;

    const stripeProvider = getOrCreateStripeProvider();
     
    const cancelledSubscription = await stripeProvider.cancelSubscription(
        subscriptionId,
      cancelAtPeriodEnd
    );

    await updateSubscriptionBySubscriptionId({
      subscriptionId: subscriptionId,
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      cancelledAt: cancelAtPeriodEnd ? new Date() : null,
      updatedAt: new Date(),
      status: cancelAtPeriodEnd ? 'cancelled' : 'active',
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");
    
    try {
      const emailData = {
        customerName: session.user.name || session.user.email || 'User',
        customerEmail: session.user.email!,
        planName: cancelledSubscription.priceId,
        subscriptionId: subscriptionId,
        cancelAtPeriodEnd,
        currentPeriodEnd: cancelledSubscription.currentPeriodEnd,
        companyName: "Ever Works",
        companyUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ever.works",
        supportEmail: process.env.EMAIL_SUPPORT || "support@ever.works",
        reactivateUrl: `${appUrl || ''}/settings/billing`
      };

      if (cancelAtPeriodEnd) {
        await paymentEmailService.sendSubscriptionCancellingEmail(emailData as any);
      } else {
        await paymentEmailService.sendSubscriptionCancellingEmail(emailData as any);
      }
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: cancelledSubscription,
      message: cancelAtPeriodEnd 
        ? 'Subscription will be cancelled at the end of the current period'
        : 'Subscription cancelled immediately'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
