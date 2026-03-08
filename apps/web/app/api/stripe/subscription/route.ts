import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';

/**
 * @swagger
 * /api/stripe/subscription:
 *   post:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Create subscription"
 *     description: "Creates a new Stripe subscription for the authenticated user with specified price and payment method. Automatically creates or retrieves Stripe customer and includes comprehensive metadata tracking."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: "Stripe price ID for the subscription"
 *                 example: "price_1234567890abcdef"
 *               paymentMethodId:
 *                 type: string
 *                 description: "Stripe payment method ID to use for the subscription"
 *                 example: "pm_1234567890abcdef"
 *               trialPeriodDays:
 *                 type: integer
 *                 minimum: 0
 *                 description: "Number of trial days (optional)"
 *                 example: 14
 *             required: ["priceId", "paymentMethodId"]
 *     responses:
 *       200:
 *         description: "Subscription created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "Stripe subscription ID"
 *                   example: "sub_1234567890abcdef"
 *                 status:
 *                   type: string
 *                   enum: ["active", "canceled", "incomplete", "incomplete_expired", "past_due", "trialing", "unpaid"]
 *                   example: "active"
 *                 customer:
 *                   type: string
 *                   description: "Stripe customer ID"
 *                   example: "cus_1234567890abcdef"
 *                 current_period_start:
 *                   type: integer
 *                   description: "Unix timestamp of current period start"
 *                   example: 1640995200
 *                 current_period_end:
 *                   type: integer
 *                   description: "Unix timestamp of current period end"
 *                   example: 1643673600
 *                 trial_start:
 *                   type: integer
 *                   nullable: true
 *                   description: "Unix timestamp of trial start"
 *                   example: 1640995200
 *                 trial_end:
 *                   type: integer
 *                   nullable: true
 *                   description: "Unix timestamp of trial end"
 *                   example: 1642204800
 *                 metadata:
 *                   type: object
 *                   description: "Subscription metadata"
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "user_123abc"
 *                   additionalProperties:
 *                     type: string
 *               required: ["id", "status", "customer", "current_period_start", "current_period_end"]
 *       400:
 *         description: "Bad request - Failed to create customer"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create customer"
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
 *                   example: "Failed to create subscription"
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, paymentMethodId, trialPeriodDays } = await request.json();

    // Get or create Stripe provider (singleton)
    const stripeProvider = getOrCreateStripeProvider();
    // Get or create customer
    const customerId = await stripeProvider.getCustomerId(session.user as any);
    
    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 400 });
    }

    // Create subscription
    const subscription = await stripeProvider.createSubscription({
      customerId,
      priceId,
      paymentMethodId,
      trialPeriodDays,
      metadata: {
        userId: session.user.id
      }
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/stripe/subscription:
 *   put:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Update subscription"
 *     description: "Updates an existing Stripe subscription with new price or cancellation settings. Includes comprehensive metadata tracking and validation."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 description: "Stripe subscription ID to update"
 *                 example: "sub_1234567890abcdef"
 *               priceId:
 *                 type: string
 *                 description: "New Stripe price ID (optional)"
 *                 example: "price_0987654321fedcba"
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 description: "Whether to cancel at period end (optional)"
 *                 example: false
 *             required: ["subscriptionId"]
 *     responses:
 *       200:
 *         description: "Subscription updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "Stripe subscription ID"
 *                   example: "sub_1234567890abcdef"
 *                 status:
 *                   type: string
 *                   enum: ["active", "canceled", "incomplete", "incomplete_expired", "past_due", "trialing", "unpaid"]
 *                   example: "active"
 *                 customer:
 *                   type: string
 *                   description: "Stripe customer ID"
 *                   example: "cus_1234567890abcdef"
 *                 cancel_at_period_end:
 *                   type: boolean
 *                   description: "Whether subscription will cancel at period end"
 *                   example: false
 *                 current_period_start:
 *                   type: integer
 *                   description: "Unix timestamp of current period start"
 *                   example: 1640995200
 *                 current_period_end:
 *                   type: integer
 *                   description: "Unix timestamp of current period end"
 *                   example: 1643673600
 *                 metadata:
 *                   type: object
 *                   description: "Updated subscription metadata"
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "user_123abc"
 *                   additionalProperties:
 *                     type: string
 *               required: ["id", "status", "customer", "cancel_at_period_end", "current_period_start", "current_period_end"]
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
 *                   example: "Failed to update subscription"
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, priceId, cancelAtPeriodEnd } = await request.json();

    // Get or create Stripe provider (singleton)
    const stripeProvider = getOrCreateStripeProvider();
    // Update subscription
    const subscription = await stripeProvider.updateSubscription({
      subscriptionId,
      priceId,
      cancelAtPeriodEnd,
      metadata: {
        userId: session.user.id
      }
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription update error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/stripe/subscription:
 *   delete:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Cancel subscription"
 *     description: "Cancels a Stripe subscription either immediately or at the end of the current billing period. Provides flexible cancellation options."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 description: "Stripe subscription ID to cancel"
 *                 example: "sub_1234567890abcdef"
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: true
 *                 description: "Whether to cancel at period end (true) or immediately (false)"
 *                 example: true
 *             required: ["subscriptionId"]
 *     responses:
 *       200:
 *         description: "Subscription cancelled successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "Stripe subscription ID"
 *                   example: "sub_1234567890abcdef"
 *                 status:
 *                   type: string
 *                   enum: ["active", "canceled"]
 *                   example: "active"
 *                 cancel_at_period_end:
 *                   type: boolean
 *                   description: "Whether subscription will cancel at period end"
 *                   example: true
 *                 canceled_at:
 *                   type: integer
 *                   nullable: true
 *                   description: "Unix timestamp when subscription was cancelled"
 *                   example: 1640995200
 *                 current_period_end:
 *                   type: integer
 *                   description: "Unix timestamp of current period end"
 *                   example: 1643673600
 *               required: ["id", "status", "cancel_at_period_end", "current_period_end"]
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
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, cancelAtPeriodEnd } = await request.json();

    // Get or create Stripe provider (singleton)
    const stripeProvider = getOrCreateStripeProvider();

    // Cancel subscription
    const subscription = await stripeProvider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
} 