import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import { buildCheckoutLineItems, createBaseCheckoutParams, applySubscriptionConfig } from './helpers';
import { safeErrorMessage } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/stripe/checkout:
 *   post:
 *     tags: ["Stripe - Core"]
 *     summary: "Create Stripe checkout session"
 *     description: "Creates a new Stripe checkout session for the authenticated user. Supports both one-time payments and subscription modes with comprehensive configuration including trial periods, billing intervals, and custom metadata. Automatically creates or retrieves Stripe customer."
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
 *                 description: "Stripe price ID for the product/service"
 *                 example: "price_1234567890abcdef"
 *               mode:
 *                 type: string
 *                 enum: ["one_time", "subscription"]
 *                 default: "one_time"
 *                 description: "Checkout mode"
 *                 example: "subscription"
 *               trialPeriodDays:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: "Trial period in days (subscription mode only)"
 *                 example: 14
 *               billingInterval:
 *                 type: string
 *                 enum: ["month", "year"]
 *                 default: "month"
 *                 description: "Billing interval for subscriptions"
 *                 example: "month"
 *               successUrl:
 *                 type: string
 *                 format: uri
 *                 description: "URL to redirect after successful payment"
 *                 example: "https://example.com/success"
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 description: "URL to redirect after cancelled payment"
 *                 example: "https://example.com/cancel"
 *               metadata:
 *                 type: object
 *                 description: "Additional metadata for the checkout session"
 *                 properties:
 *                   planId:
 *                     type: string
 *                     example: "pro_plan"
 *                   planName:
 *                     type: string
 *                     example: "Pro Plan"
 *                 additionalProperties:
 *                   type: string
 *             required: ["priceId", "successUrl", "cancelUrl"]
 *     responses:
 *       200:
 *         description: "Checkout session created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: "Stripe checkout session ID"
 *                       example: "cs_test_1234567890abcdef"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: "Stripe checkout URL"
 *                       example: "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Checkout session created successfully"
 *               required: ["data", "status", "message"]
 *             example:
 *               data:
 *                 id: "cs_test_1234567890abcdef"
 *                 url: "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
 *               status: 200
 *               message: "Checkout session created successfully"
 *       400:
 *         description: "Bad request - Failed to create customer or invalid parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create customer"
 *                 message:
 *                   type: string
 *                   example: "Unable to create Stripe customer"
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
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create checkout session"
 *                 message:
 *                   type: string
 *                   example: "Failed to create checkout session"
 *                 details:
 *                   type: string
 *                   description: "Error stack trace (development only)"
 *                   example: "Error: Invalid price ID..."
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user) {
			return NextResponse.json(
				{
					error: 'Unauthorized',
					message: 'Authentication required'
				},
				{ status: 401 }
			);
		}

		// Get or create Stripe provider (singleton)
		const stripeProvider = getOrCreateStripeProvider();
		const stripe = stripeProvider.getStripeInstance();

		const {
			priceId,
			mode = 'one_time',
			trialPeriodDays = 0,
			billingInterval = 'month',
			trialAmountId,
			isAuthorizedTrialAmount = false,
			successUrl,
			cancelUrl,
			metadata = {}
		} = await request.json();

		// Map the incoming mode to Stripe's expected Mode type
		const stripeMode: 'payment' | 'setup' | 'subscription' =
			mode === 'one_time' ? 'payment' : mode === 'subscription' ? 'subscription' : 'setup';

		const stripeCustomerId = await stripeProvider.getCustomerId(session.user as any);
		if (!stripeCustomerId) {
			return NextResponse.json(
				{
					error: 'Failed to create customer',
					message: 'Unable to create Stripe customer'
				},
				{ status: 400 }
			);
		}

		// Build line items with optional trial period
		const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;

		// Validate trial configuration: if trial is enabled, trialAmountId must be provided
		if (hasTrial && !trialAmountId) {
			return NextResponse.json(
				{
					error: 'Invalid trial configuration',
					message: 'trialAmountId is required when trial is enabled'
				},
				{ status: 400 }
			);
		}

		const lineItems = buildCheckoutLineItems(priceId, trialAmountId, hasTrial);

		// Create base checkout parameters
		const checkoutParams = createBaseCheckoutParams({
			customerId: stripeCustomerId,
			mode: stripeMode,
			lineItems,
			successUrl,
			cancelUrl,
			metadata: {
				...metadata,
				...session.user
			},
			billingInterval
		});

		// Apply subscription-specific configuration
		if (stripeMode === 'subscription') {
			applySubscriptionConfig(checkoutParams, {
				userId: session.user.id || '',
				planId: metadata.planId,
				planName: metadata.planName,
				billingInterval,
				trialPeriodDays: hasTrial ? trialPeriodDays : 0
			});
		}

		const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

		return NextResponse.json({
			data: {
				id: checkoutSession.id,
				url: checkoutSession.url
			},
			status: 200,
			message: 'Checkout session created successfully'
		});
	} catch (error) {
		console.error('Checkout session creation error:', error);

		const errorMessage = safeErrorMessage(error, 'Failed to create checkout session');

		return NextResponse.json(
			{
				error: errorMessage,
				message: 'Failed to create checkout session',
				details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
}

/**
 * @swagger
 * /api/stripe/checkout:
 *   get:
 *     tags: ["Stripe - Core"]
 *     summary: "Retrieve checkout session"
 *     description: "Retrieves a Stripe checkout session by session ID with expanded line items and subscription data. Used to verify payment status and get session details after checkout completion."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "session_id"
 *         in: "query"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe checkout session ID"
 *         example: "cs_test_1234567890abcdef"
 *     responses:
 *       200:
 *         description: "Checkout session retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *                   description: "Complete Stripe checkout session object"
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "cs_test_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       enum: ["open", "complete", "expired"]
 *                       example: "complete"
 *                     payment_status:
 *                       type: string
 *                       enum: ["paid", "unpaid", "no_payment_required"]
 *                       example: "paid"
 *                     amount_total:
 *                       type: integer
 *                       example: 2999
 *                     currency:
 *                       type: string
 *                       example: "usd"
 *                     customer:
 *                       type: string
 *                       example: "cus_1234567890abcdef"
 *                     subscription:
 *                       type: string
 *                       nullable: true
 *                       example: "sub_1234567890abcdef"
 *                     line_items:
 *                       type: object
 *                       description: "Expanded line items"
 *                 status:
 *                   type: string
 *                   description: "Session status"
 *                   example: "complete"
 *                 customer:
 *                   type: string
 *                   description: "Stripe customer ID"
 *                   example: "cus_1234567890abcdef"
 *                 subscription:
 *                   type: string
 *                   nullable: true
 *                   description: "Stripe subscription ID (if applicable)"
 *                   example: "sub_1234567890abcdef"
 *               required: ["session", "status", "customer"]
 *       400:
 *         description: "Bad request - Session ID is required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Session ID is required"
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
 *                   example: "Failed to retrieve checkout session"
 *                 details:
 *                   type: string
 *                   description: "Error stack trace (development only)"
 *                   example: "Error: No such checkout session..."
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get or create Stripe provider (singleton)
		const stripeProvider = getOrCreateStripeProvider();
		const stripe = stripeProvider.getStripeInstance();

		const { searchParams } = new URL(request.url);
		const sessionId = searchParams.get('session_id');

		if (!sessionId) {
			return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
		}

		// Retrieve checkout session
		const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['line_items', 'subscription']
		});

		return NextResponse.json({
			session: checkoutSession,
			status: checkoutSession.status,
			customer: checkoutSession.customer,
			subscription: checkoutSession.subscription
		});
	} catch (error) {
		console.error('Checkout session retrieval error:', error);

		const errorMessage = safeErrorMessage(error, 'Failed to retrieve checkout session');

		return NextResponse.json(
			{
				error: errorMessage,
				details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
}
