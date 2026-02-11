import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth, getOrCreateSolidgateProvider } from '@/lib/auth';
import { safeErrorMessage } from '@/lib/utils/api-error';

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

		// Define verification schema
		const checkoutSchema = z.object({
			amount: z.number().positive(),
			currency: z.string().default('USD'),
			mode: z.enum(['one_time', 'subscription']).default('one_time'),
			successUrl: z.string().url(),
			cancelUrl: z.string().url(),
			metadata: z.record(z.string(), z.any()).optional()
		});

		let payload;
		try {
			const json = await request.json();
			const result = checkoutSchema.safeParse(json);

			if (!result.success) {
				const errorMessage = result.error.issues
					.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
					.join(', ');
				return NextResponse.json(
					{
						error: 'Invalid request body',
						message: errorMessage
					},
					{ status: 400 }
				);
			}
			payload = result.data;
		} catch (e) {
			return NextResponse.json(
				{
					error: 'Invalid JSON',
					message: 'Request body must be valid JSON'
				},
				{ status: 400 }
			);
		}

		const { amount, currency, mode, successUrl, cancelUrl, metadata } = payload;

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
				url: paymentIntent.clientSecret // Solidgate uses the clientSecret (ID) to initialize the SDK
			},
			status: 200,
			message: 'Checkout session created successfully'
		});
	} catch (error) {
		console.error('Solidgate checkout session creation error:', error);

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
