import { NextResponse } from 'next/server';
import { auth, initializeStripeProvider } from '@/lib/auth';

/**
 * @swagger
 * /api/user/subscription:
 *   get:
 *     tags: ["User"]
 *     summary: "Get user subscription status"
 *     description: "Retrieves comprehensive subscription information for the authenticated user from Stripe, including current active subscription details and complete subscription history. Provides detailed billing and plan information."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Subscription status retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasActiveSubscription:
 *                   type: boolean
 *                   description: "Whether user has an active subscription"
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: "Status message (only when no customer found)"
 *                   example: "No Stripe customer found"
 *                 currentSubscription:
 *                   type: object
 *                   nullable: true
 *                   description: "Current active subscription details"
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Stripe subscription ID"
 *                       example: "sub_1234567890abcdef"
 *                     planId:
 *                       type: string
 *                       description: "Stripe price ID"
 *                       example: "price_1234567890abcdef"
 *                     planName:
 *                       type: string
 *                       description: "Plan display name"
 *                       example: "Premium Plan"
 *                     status:
 *                       type: string
 *                       enum: ["active", "trialing", "past_due", "canceled", "unpaid"]
 *                       description: "Subscription status"
 *                       example: "active"
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: "Subscription start date"
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: "Current period end date"
 *                       example: "2024-02-15T10:30:00.000Z"
 *                     nextBillingDate:
 *                       type: string
 *                       format: date-time
 *                       description: "Next billing date"
 *                       example: "2024-02-15T10:30:00.000Z"
 *                     paymentProvider:
 *                       type: string
 *                       enum: ["stripe"]
 *                       description: "Payment provider"
 *                       example: "stripe"
 *                     subscriptionId:
 *                       type: string
 *                       description: "Subscription identifier"
 *                       example: "sub_1234567890abcdef"
 *                     amount:
 *                       type: number
 *                       description: "Subscription amount (in major currency units)"
 *                       example: 29.99
 *                     currency:
 *                       type: string
 *                       description: "Currency code (uppercase)"
 *                       example: "USD"
 *                     billingInterval:
 *                       type: string
 *                       enum: ["monthly", "yearly", "weekly", "daily"]
 *                       description: "Billing frequency"
 *                       example: "monthly"
 *                     items:
 *                       type: object
 *                       description: "Stripe subscription item details"
 *                     currentPeriodEnd:
 *                       type: string
 *                       format: date-time
 *                       description: "Current period end date"
 *                       example: "2024-02-15T10:30:00.000Z"
 *                     currentPeriodStart:
 *                       type: string
 *                       format: date-time
 *                       description: "Current period start date"
 *                       example: "2024-01-15T10:30:00.000Z"
 *                   required: ["id", "planId", "planName", "status", "startDate", "paymentProvider", "subscriptionId", "amount", "currency", "billingInterval"]
 *                 subscriptionHistory:
 *                   type: array
 *                   description: "Complete subscription history"
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: "Stripe subscription ID"
 *                         example: "sub_1234567890abcdef"
 *                       planId:
 *                         type: string
 *                         description: "Stripe price ID"
 *                         example: "price_1234567890abcdef"
 *                       planName:
 *                         type: string
 *                         description: "Plan display name"
 *                         example: "Premium Plan"
 *                       status:
 *                         type: string
 *                         enum: ["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"]
 *                         description: "Subscription status"
 *                         example: "active"
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Subscription start date"
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         description: "Subscription end date"
 *                         example: "2024-02-15T10:30:00.000Z"
 *                       cancelledAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: "Cancellation date (if cancelled)"
 *                         example: "2024-01-20T15:45:00.000Z"
 *                       cancelReason:
 *                         type: string
 *                         nullable: true
 *                         description: "Cancellation reason"
 *                         example: "user_requested"
 *                       amount:
 *                         type: number
 *                         description: "Subscription amount (in major currency units)"
 *                         example: 29.99
 *                       currency:
 *                         type: string
 *                         description: "Currency code (uppercase)"
 *                         example: "USD"
 *                       billingInterval:
 *                         type: string
 *                         enum: ["monthly", "yearly", "weekly", "daily"]
 *                         description: "Billing frequency"
 *                         example: "monthly"
 *                     required: ["id", "planId", "planName", "status", "startDate", "amount", "currency", "billingInterval"]
 *               required: ["hasActiveSubscription", "subscriptionHistory"]
 *             examples:
 *               active_subscription:
 *                 summary: "User with active subscription"
 *                 value:
 *                   hasActiveSubscription: true
 *                   currentSubscription:
 *                     id: "sub_1234567890abcdef"
 *                     planId: "price_1234567890abcdef"
 *                     planName: "Premium Plan"
 *                     status: "active"
 *                     startDate: "2024-01-15T10:30:00.000Z"
 *                     endDate: "2024-02-15T10:30:00.000Z"
 *                     nextBillingDate: "2024-02-15T10:30:00.000Z"
 *                     paymentProvider: "stripe"
 *                     subscriptionId: "sub_1234567890abcdef"
 *                     amount: 29.99
 *                     currency: "USD"
 *                     billingInterval: "monthly"
 *                     currentPeriodEnd: "2024-02-15T10:30:00.000Z"
 *                     currentPeriodStart: "2024-01-15T10:30:00.000Z"
 *                   subscriptionHistory:
 *                     - id: "sub_1234567890abcdef"
 *                       planId: "price_1234567890abcdef"
 *                       planName: "Premium Plan"
 *                       status: "active"
 *                       startDate: "2024-01-15T10:30:00.000Z"
 *                       endDate: "2024-02-15T10:30:00.000Z"
 *                       amount: 29.99
 *                       currency: "USD"
 *                       billingInterval: "monthly"
 *               no_active_subscription:
 *                 summary: "User without active subscription"
 *                 value:
 *                   hasActiveSubscription: false
 *                   subscriptionHistory:
 *                     - id: "sub_0987654321fedcba"
 *                       planId: "price_0987654321fedcba"
 *                       planName: "Basic Plan"
 *                       status: "canceled"
 *                       startDate: "2023-12-01T10:30:00.000Z"
 *                       endDate: "2024-01-01T10:30:00.000Z"
 *                       cancelledAt: "2023-12-20T15:45:00.000Z"
 *                       cancelReason: "user_requested"
 *                       amount: 19.99
 *                       currency: "USD"
 *                       billingInterval: "monthly"
 *               no_customer:
 *                 summary: "User with no Stripe customer"
 *                 value:
 *                   hasActiveSubscription: false
 *                   message: "No Stripe customer found"
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
 *                   examples:
 *                     stripe_error: "Failed to fetch subscription data from Stripe"
 *                     general_error: "Failed to fetch subscription data"
 *     x-data-sources:
 *       description: "Data sources and processing"
 *       sources:
 *         - "Stripe Subscriptions API"
 *         - "Stripe Payment Methods API (expanded)"
 *       processing:
 *         - "Identifies active/trialing subscriptions"
 *         - "Enriches with subscription metadata"
 *         - "Converts amounts from cents to major units"
 *         - "Provides complete subscription history"
 *         - "Includes cancellation details when available"
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Stripe provider
    const stripeProvider = initializeStripeProvider();
		const stripe = stripeProvider.getStripeInstance();

    // Get or create customer ID
    const customerId = await stripeProvider.getCustomerId(session.user as any);
    
    if (!customerId) {
      return NextResponse.json({ 
        hasActiveSubscription: false,
        message: 'No Stripe customer found' 
      });
    }

    try {
      // Fetch all subscriptions for this customer (reduced expansion levels)
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
        expand: ['data.default_payment_method']
      });

      // Find active subscription
      const activeSubscription = subscriptions.data.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      // Transform Stripe data to our format
      const subscriptionData = {
        hasActiveSubscription: !!activeSubscription,
        currentSubscription: activeSubscription ? {
          id: activeSubscription.id,
          planId: activeSubscription.items.data[0]?.price.id || '',
          planName: activeSubscription.metadata.planName || 'Premium Plan',
          status: activeSubscription.status,
          startDate: new Date(activeSubscription.start_date * 1000).toISOString(),
          endDate: (activeSubscription as any).current_period_end ? new Date((activeSubscription as any).current_period_end * 1000).toISOString() : '',
          nextBillingDate: (activeSubscription as any).current_period_end ? new Date((activeSubscription as any).current_period_end * 1000).toISOString() : '',
          paymentProvider: 'stripe',
          subscriptionId: activeSubscription.id,
          amount: activeSubscription.items.data[0]?.price.unit_amount ? activeSubscription.items.data[0].price.unit_amount / 100 : 0,
          currency: activeSubscription.currency.toUpperCase(),
          billingInterval: activeSubscription.items.data[0]?.price.recurring?.interval || 'monthly',
          items: activeSubscription.items.data[0],
          currentPeriodEnd: activeSubscription.items.data[0]?.current_period_end ? new Date(activeSubscription.items.data[0].current_period_end * 1000).toISOString() : '',
          currentPeriodStart: activeSubscription.items.data[0]?.current_period_start ? new Date(activeSubscription.items.data[0].current_period_start * 1000).toISOString() : ''
        } : undefined,
        subscriptionHistory: subscriptions.data.map(sub => ({
          
          id: sub.id,
          planId: sub.items.data[0]?.price.id || '',
          planName: sub.metadata.planName ||  'Premium Plan', 
          status: sub.status,
          startDate: new Date(sub.start_date * 1000).toISOString(),
          endDate: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : '',
          cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
          cancelReason: sub.cancellation_details?.reason || undefined,
          amount: sub.items.data[0]?.price.unit_amount ? sub.items.data[0].price.unit_amount / 100 : 0,
          currency: sub.currency.toUpperCase(),
          billingInterval: sub.items.data[0]?.price.recurring?.interval || 'monthly'
        }))
      };

      return NextResponse.json(subscriptionData);
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription data from Stripe' }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' }, 
      { status: 500 }
    );
  }
}
