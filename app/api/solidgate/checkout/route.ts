import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateSolidgateProvider } from '@/lib/auth';

const appUrl =
	process.env.NEXT_PUBLIC_APP_URL ??
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');

/**
 * @swagger
 * /api/solidgate/checkout:
 *   post:
 *     tags: ["Solidgate - Core"]
 *     summary: "Create Solidgate checkout session"
 *     description: "Creates a new Solidgate checkout session for the authenticated user. Supports both one-time payments and subscription modes. Automatically creates or retrieves Solidgate customer."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: "Payment amount"
 *                 example: 29.99
 *               currency:
 *                 type: string
 *                 description: "Currency code (e.g., USD, EUR)"
 *                 default: "USD"
 *                 example: "USD"
 *               mode:
 *                 type: string
 *                 enum: ["one_time", "subscription"]
 *                 default: "one_time"
 *                 description: "Checkout mode"
 *                 example: "one_time"
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
 *             required: ["amount", "successUrl", "cancelUrl"]
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
 *                       description: "Solidgate payment ID"
 *                       example: "payment_1234567890abcdef"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: "Solidgate checkout URL"
 *                       example: "https://checkout.solidgate.com/pay/payment_1234567890abcdef"
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Checkout session created successfully"
 *               required: ["data", "status", "message"]
 *             example:
 *               data:
 *                 id: "payment_1234567890abcdef"
 *                 url: "https://checkout.solidgate.com/pay/payment_1234567890abcdef"
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
 *                   example: "Unable to create Solidgate customer"
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
 *                   example: "Error: Invalid amount..."
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

		// Get or create Solidgate provider (singleton)
		const solidgateProvider = getOrCreateSolidgateProvider();

		const {
			amount,
			currency = 'USD',
			mode = 'one_time',
			successUrl,
			cancelUrl,
			metadata = {}
		} = await request.json();

		if (!amount || amount <= 0) {
			return NextResponse.json(
				{
					error: 'Invalid amount',
					message: 'Amount must be greater than 0'
				},
				{ status: 400 }
			);
		}

		if (!successUrl || !cancelUrl) {
			return NextResponse.json(
				{
					error: 'Missing URLs',
					message: 'successUrl and cancelUrl are required'
				},
				{ status: 400 }
			);
		}

		const solidgateCustomerId = await solidgateProvider.getCustomerId(session.user as any);
		if (!solidgateCustomerId) {
			return NextResponse.json(
				{
					error: 'Failed to create customer',
					message: 'Unable to create Solidgate customer'
				},
				{ status: 400 }
			);
		}

		// Create payment intent
		const paymentIntent = await solidgateProvider.createPaymentIntent({
			amount,
			currency,
			customerId: solidgateCustomerId,
			successUrl,
			cancelUrl,
			metadata: {
				...metadata,
				userId: session.user.id,
				email: session.user.email,
				mode
			}
		});

		return NextResponse.json({
			data: {
				id: paymentIntent.id,
				url: paymentIntent.clientSecret // In Solidgate, clientSecret contains the payment URL
			},
			status: 200,
			message: 'Checkout session created successfully'
		});
	} catch (error) {
		console.error('Solidgate checkout session creation error:', error);

		const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';

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
