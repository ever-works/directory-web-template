import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreatePolarProvider } from '@/lib/auth';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/polar/checkout:
 *   post:
 *     tags: ["Polar - Core"]
 *     summary: "Create Polar checkout session"
 *     description: "Creates a new Polar checkout session for the authenticated user. Supports both one-time payments and subscription modes. Automatically creates or retrieves Polar customer."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 description: "Polar product ID for the product/service"
 *                 example: "prod_1234567890abcdef"
 *               mode:
 *                 type: string
 *                 enum: ["one_time", "subscription"]
 *                 default: "subscription"
 *                 description: "Checkout mode"
 *                 example: "subscription"
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
 *             required: ["productId", "successUrl", "cancelUrl"]
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
 *                       description: "Polar checkout session ID"
 *                       example: "checkout_1234567890abcdef"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: "Polar checkout URL"
 *                       example: "https://polar.sh/checkout/checkout_1234567890abcdef"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Checkout session created successfully"
 *               required: ["data", "status", "message"]
 *             example:
 *               data:
 *                 id: "checkout_1234567890abcdef"
 *                 url: "https://polar.sh/checkout/checkout_1234567890abcdef"
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
 *                   example: "Unable to create Polar customer"
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
 *                   example: "Error: Invalid product ID..."
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

		// Get or create Polar provider (singleton)
		const polarProvider = getOrCreatePolarProvider();

		const {
			productId,
			mode = 'subscription',
			successUrl,
			cancelUrl,
			metadata = {}
		} = await request.json();

		if (!productId) {
			return NextResponse.json(
				{
					error: 'Invalid request',
					message: 'Product ID is required'
				},
				{ status: 400 }
			);
		}

		// Get or create Polar customer
		const polarCustomerId = await polarProvider.getCustomerId(session.user as any);
		if (!polarCustomerId) {
			return NextResponse.json(
				{
					error: 'Failed to create customer',
					message: 'Unable to create Polar customer'
				},
				{ status: 400 }
			);
		}

		// Create checkout session based on mode
		if (mode === 'subscription') {
			// Sanitize metadata to remove undefined values (Polar doesn't accept undefined)
			const sanitizedMetadata: Record<string, any> = {
				userId: session.user.id || '',
				successUrl,
				cancelUrl
			};
			
			if (metadata.planId) {
				sanitizedMetadata.planId = metadata.planId;
			}
			if (metadata.planName) {
				sanitizedMetadata.planName = metadata.planName;
			}
			if (metadata.billingInterval) {
				sanitizedMetadata.billingInterval = metadata.billingInterval;
			}
			
			// Add any other metadata that's not undefined
			Object.entries(metadata).forEach(([key, value]) => {
				if (value !== undefined && value !== null && !['planId', 'planName', 'billingInterval', 'userId', 'successUrl', 'cancelUrl'].includes(key)) {
					sanitizedMetadata[key] = value;
				}
			});

			// For subscriptions, use createSubscription which creates a checkout
			const subscriptionResult = await polarProvider.createSubscription({
				customerId: polarCustomerId,
				priceId: productId, // Polar uses productId for subscriptions
				metadata: sanitizedMetadata
			});

			if (!subscriptionResult.checkoutData?.url) {
				return NextResponse.json(
					{
						error: 'Failed to create checkout',
						message: 'Checkout URL not available'
					},
					{ status: 500 }
				);
			}

			return NextResponse.json({
				data: {
					id: subscriptionResult.checkoutData.checkoutId || subscriptionResult.id,
					url: subscriptionResult.checkoutData.url
				},
				status: 200,
				message: 'Checkout session created successfully'
			});
		} else {
			// For one-time payments, create a checkout directly using Polar SDK
			// Access private properties via type assertion (PolarProvider doesn't expose a public method for one-time checkouts)
			const polar = (polarProvider as any).polar;
			const organizationId = (polarProvider as any).organizationId;

			if (!polar || !organizationId) {
				return NextResponse.json(
					{
						error: 'Configuration error',
						message: 'Polar provider not properly configured'
					},
					{ status: 500 }
				);
			}

			// Sanitize metadata to remove undefined values (Polar doesn't accept undefined)
			const sanitizedMetadata: Record<string, any> = {
				userId: session.user.id || ''
			};
			
			if (metadata.planId) {
				sanitizedMetadata.planId = metadata.planId;
			}
			if (metadata.planName) {
				sanitizedMetadata.planName = metadata.planName;
			}
			if (metadata.billingInterval) {
				sanitizedMetadata.billingInterval = metadata.billingInterval;
			}
			
			// Add any other metadata that's not undefined
			Object.entries(metadata).forEach(([key, value]) => {
				if (value !== undefined && value !== null && !['planId', 'planName', 'billingInterval', 'userId'].includes(key)) {
					sanitizedMetadata[key] = value;
				}
			});

			const checkout = await polar.checkouts.create({
				products: [productId],
				organizationId: organizationId,
				customerId: polarCustomerId,
				successUrl: successUrl,
				cancelUrl: cancelUrl,
				metadata: sanitizedMetadata
			} as any);

			if (!(checkout as any).url) {
				return NextResponse.json(
					{
						error: 'Failed to create checkout',
						message: 'Checkout URL not available'
					},
					{ status: 500 }
				);
			}

			return NextResponse.json({
				data: {
					id: (checkout as any).id || '',
					url: (checkout as any).url
				},
				status: 200,
				message: 'Checkout session created successfully'
			});
		}
	} catch (error) {
		// Check for payment setup errors
		let statusCode = 500;
		let fallbackMessage = 'Failed to create checkout session';

		if (error instanceof Error) {
			if (error.message.includes('Payments are currently unavailable') ||
			    error.message.includes('needs to complete their payment setup') ||
			    error.message.includes('payment setup incomplete')) {
				statusCode = 503; // Service Unavailable
				fallbackMessage = 'Polar payment setup incomplete: The organization needs to complete payment configuration in the Polar dashboard before payments can be processed. Please contact the administrator or complete the payment setup in your Polar dashboard.';
			}
		}

		return safeErrorResponse(error, fallbackMessage, statusCode);
	}
}

/**
 * @swagger
 * /api/polar/checkout:
 *   get:
 *     tags: ["Polar - Core"]
 *     summary: "Retrieve checkout session"
 *     description: "Retrieves a Polar checkout session by session ID. Used to verify payment status and get session details after checkout completion."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "checkout_id"
 *         in: "query"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Polar checkout session ID"
 *         example: "checkout_1234567890abcdef"
 *     responses:
 *       200:
 *         description: "Checkout session retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkout:
 *                   type: object
 *                   description: "Complete Polar checkout session object"
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "checkout_1234567890abcdef"
 *                     status:
 *                       type: string
 *                       enum: ["open", "complete", "expired"]
 *                       example: "complete"
 *                     customer:
 *                       type: string
 *                       example: "customer_1234567890abcdef"
 *                     subscription:
 *                       type: string
 *                       nullable: true
 *                       description: "Polar subscription ID (if applicable)"
 *                       example: "subscription_1234567890abcdef"
 *                 status:
 *                   type: string
 *                   description: "Session status"
 *                   example: "complete"
 *                 customer:
 *                   type: string
 *                   description: "Polar customer ID"
 *                   example: "customer_1234567890abcdef"
 *                 subscription:
 *                   type: string
 *                   nullable: true
 *                   description: "Polar subscription ID (if applicable)"
 *                   example: "subscription_1234567890abcdef"
 *               required: ["checkout", "status", "customer"]
 *       400:
 *         description: "Bad request - Checkout ID is required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Checkout ID is required"
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

		// Get or create Polar provider (singleton)
		const polarProvider = getOrCreatePolarProvider();
		const polar = (polarProvider as any).polar;

		if (!polar) {
			return NextResponse.json(
				{
					error: 'Configuration error',
					message: 'Polar provider not properly configured'
				},
				{ status: 500 }
			);
		}

		const { searchParams } = new URL(request.url);
		const checkoutId = searchParams.get('checkout_id');

		if (!checkoutId) {
			return NextResponse.json({ error: 'Checkout ID is required' }, { status: 400 });
		}

		// Retrieve checkout session from Polar
		const checkout = await polar.checkouts.get({ id: checkoutId } as any);

		return NextResponse.json({
			checkout: checkout,
			status: (checkout as any).status || 'unknown',
			customer: (checkout as any).customer?.id || (checkout as any).customerId,
			subscription: (checkout as any).subscription?.id || (checkout as any).subscriptionId
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to retrieve checkout session');
	}
}

