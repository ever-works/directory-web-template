/**
 * Subscriptions API Routes
 * Handles subscription management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/services/subscription.service';

/**
 * @swagger
 * /api/stripe/subscriptions:
 *   get:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Get user subscriptions"
 *     description: "Retrieves subscriptions for the authenticated user with optional filtering for active subscriptions only or including subscription history. Returns comprehensive subscription data with plan information and usage limits."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "active"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: boolean
 *         description: "Return only active subscription"
 *         example: true
 *       - name: "history"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: boolean
 *         description: "Include subscription history"
 *         example: false
 *     responses:
 *       200:
 *         description: "Subscriptions retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - title: "Active subscription only"
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       nullable: true
 *                       description: "Active subscription data"
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "sub_1234567890abcdef"
 *                         userId:
 *                           type: string
 *                           example: "user_123abc"
 *                         planId:
 *                           type: string
 *                           example: "pro_plan"
 *                         status:
 *                           type: string
 *                           enum: ["active", "canceled", "incomplete", "incomplete_expired", "past_due", "trialing", "unpaid"]
 *                           example: "active"
 *                         currentPeriodStart:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00.000Z"
 *                         currentPeriodEnd:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-02-01T00:00:00.000Z"
 *                     plan:
 *                       type: string
 *                       nullable: true
 *                       description: "Plan display name"
 *                       example: "Pro Plan"
 *                     limits:
 *                       type: object
 *                       nullable: true
 *                       description: "Plan usage limits"
 *                       properties:
 *                         projects:
 *                           type: integer
 *                           example: 10
 *                         storage:
 *                           type: string
 *                           example: "100GB"
 *                         users:
 *                           type: integer
 *                           example: 5
 *                   required: ["data", "plan", "limits"]
 *                 - title: "All subscriptions"
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       description: "All user subscriptions"
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "sub_1234567890abcdef"
 *                           userId:
 *                             type: string
 *                             example: "user_123abc"
 *                           planId:
 *                             type: string
 *                             example: "pro_plan"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00.000Z"
 *                     history:
 *                       type: array
 *                       nullable: true
 *                       description: "Subscription history (if requested)"
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "hist_123"
 *                           action:
 *                             type: string
 *                             example: "created"
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00.000Z"
 *                     meta:
 *                       type: object
 *                       description: "Subscription metadata"
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: "Total number of subscriptions"
 *                           example: 2
 *                         hasActive:
 *                           type: boolean
 *                           description: "Whether user has active subscription"
 *                           example: true
 *                         currentPlan:
 *                           type: string
 *                           nullable: true
 *                           description: "Current plan name"
 *                           example: "pro_plan"
 *                       required: ["total", "hasActive", "currentPlan"]
 *                   required: ["data", "meta"]
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
 *                   example: "Internal server error"
 */
// GET /api/subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const includeHistory = searchParams.get('history') === 'true';

    if (activeOnly) {
      // Get only active subscription
      const subscription = await subscriptionService.getUserActiveSubscription(session.user.id);
      return NextResponse.json({
        data: subscription,
        plan: subscription ? subscriptionService.getPlanDisplayName(subscription.planId) : null,
        limits: subscription ? subscriptionService.getPlanLimits(subscription.planId) : null,
      });
    }

    // Get all subscriptions
    const subscriptions = await subscriptionService.getUserSubscriptions(session.user.id);
    
    // Include history if requested
    let history = null;
    if (includeHistory && subscriptions.length > 0) {
      history = await subscriptionService.getSubscriptionHistory(subscriptions[0].id);
    }

    return NextResponse.json({
      data: subscriptions,
      history,
      meta: {
        total: subscriptions.length,
        hasActive: await subscriptionService.hasActiveSubscription(session.user.id),
        currentPlan: await subscriptionService.getUserPlan(session.user.id)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/stripe/subscriptions:
 *   post:
 *     tags: ["Stripe - Subscriptions"]
 *     summary: "Create subscription"
 *     description: "Creates a new subscription record for the authenticated user. Validates required fields and ensures user doesn't already have an active subscription. Links subscription to payment provider and includes comprehensive metadata tracking."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 description: "Plan identifier"
 *                 example: "pro_plan"
 *               paymentProvider:
 *                 type: string
 *                 enum: ["stripe", "lemonsqueezy"]
 *                 description: "Payment provider name"
 *                 example: "stripe"
 *               subscriptionId:
 *                 type: string
 *                 description: "Provider subscription ID"
 *                 example: "sub_1234567890abcdef"
 *               priceId:
 *                 type: string
 *                 description: "Provider price ID"
 *                 example: "price_1234567890abcdef"
 *               customerId:
 *                 type: string
 *                 description: "Provider customer ID"
 *                 example: "cus_1234567890abcdef"
 *               currency:
 *                 type: string
 *                 default: "usd"
 *                 description: "Subscription currency"
 *                 example: "usd"
 *               amount:
 *                 type: integer
 *                 description: "Subscription amount in cents"
 *                 example: 2999
 *               interval:
 *                 type: string
 *                 enum: ["day", "week", "month", "year"]
 *                 description: "Billing interval"
 *                 example: "month"
 *               intervalCount:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: "Interval count"
 *                 example: 1
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: "Subscription start date"
 *                 example: "2024-01-01T00:00:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: "Subscription end date"
 *                 example: "2024-02-01T00:00:00.000Z"
 *               trialStart:
 *                 type: string
 *                 format: date-time
 *                 description: "Trial start date"
 *                 example: "2024-01-01T00:00:00.000Z"
 *               trialEnd:
 *                 type: string
 *                 format: date-time
 *                 description: "Trial end date"
 *                 example: "2024-01-15T00:00:00.000Z"
 *               metadata:
 *                 type: object
 *                 description: "Additional subscription metadata"
 *                 additionalProperties: true
 *             required: ["planId", "paymentProvider", "subscriptionId"]
 *     responses:
 *       201:
 *         description: "Subscription created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: "Created subscription data"
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "sub_internal_123"
 *                     userId:
 *                       type: string
 *                       example: "user_123abc"
 *                     planId:
 *                       type: string
 *                       example: "pro_plan"
 *                     paymentProvider:
 *                       type: string
 *                       example: "stripe"
 *                     subscriptionId:
 *                       type: string
 *                       example: "sub_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Subscription created successfully"
 *               required: ["data", "message"]
 *       400:
 *         description: "Bad request - Missing required fields"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: planId, paymentProvider, subscriptionId"
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
 *       409:
 *         description: "Conflict - User already has active subscription"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User already has an active subscription"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
// POST /api/subscriptions - Create a new subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      planId,
      paymentProvider,
      subscriptionId,
      priceId,
      customerId,
      currency,
      amount,
      interval,
      intervalCount,
      startDate,
      endDate,
      trialStart,
      trialEnd,
      metadata
    } = body;

    // Validate required fields
    if (!planId || !paymentProvider || !subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, paymentProvider, subscriptionId' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const hasActive = await subscriptionService.hasActiveSubscription(session.user.id);
    if (hasActive) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 409 }
      );
    }

    // Create subscription
    const subscription = await subscriptionService.createSubscription({
      userId: session.user.id,
      planId,
      paymentProvider,
      subscriptionId,
      priceId,
      customerId,
      currency,
      amount,
      interval,
      intervalCount,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      trialStart: trialStart ? new Date(trialStart) : undefined,
      trialEnd: trialEnd ? new Date(trialEnd) : undefined,
      metadata
    });

    return NextResponse.json({
      data: subscription,
      message: 'Subscription created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/subscriptions - Update subscription
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId, ...updateData } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required field: subscriptionId' },
        { status: 400 }
      );
    }

    // Get subscription to verify ownership
    const subscription = await subscriptionService.getSubscriptionById(subscriptionId);
    if (!subscription || subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Update subscription
    const updatedSubscription = await subscriptionService.updateSubscription(
      subscriptionId,
      updateData
    );

    return NextResponse.json({
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');
    const reason = searchParams.get('reason');
    const cancelAtPeriodEnd = searchParams.get('cancelAtPeriodEnd') === 'true';

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Get subscription to verify ownership
    const subscription = await subscriptionService.getSubscriptionById(subscriptionId);
    if (!subscription || subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Cancel subscription
    const cancelledSubscription = await subscriptionService.cancelSubscription(
      subscriptionId,
      reason || 'User requested cancellation',
      cancelAtPeriodEnd
    );

    return NextResponse.json({
      data: cancelledSubscription,
      message: cancelAtPeriodEnd 
        ? 'Subscription will be cancelled at the end of the current period'
        : 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 