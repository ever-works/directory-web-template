import { NextRequest, NextResponse } from 'next/server';
import { validateCheckoutRequestBody, validateCheckoutQueryParams } from '@/lib/payment/config/validation';
import { HTTP_STATUS, ERROR_TYPES, CreateCheckoutResponse, CreateCheckoutError } from '@/lib/payment/config/types';
import { auth, getOrCreateLemonsqueezyProvider, PaymentProviderManager } from '@/lib/auth';
import { buildLemonSqueezyCheckoutParams } from '@/lib/payment/lemonsqueezy-checkout-params';

/**
 * @swagger
 * /api/lemonsqueezy/checkout:
 *   post:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "Create checkout session"
 *     description: "Creates a new LemonSqueezy checkout session for the authenticated user. Validates the request data, creates a custom checkout with user metadata, and returns the checkout URL. Requires user authentication and handles various error scenarios including configuration and validation errors. Only variantId and dark are taken from the body: the variant's own price is charged and the checkout custom data is set from the session (spec 060 R10)."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               variantId:
 *                 type: string
 *                 description: "LemonSqueezy product variant ID"
 *                 example: "123456"
 *               dark:
 *                 type: boolean
 *                 description: "Enable dark mode for checkout"
 *                 example: true
 *               customPrice:
 *                 type: number
 *                 minimum: 0
 *                 deprecated: true
 *                 description: "Ignored: the checkout charges the variant's own price (still validated)"
 *                 example: 2999
 *               metadata:
 *                 type: object
 *                 deprecated: true
 *                 description: "Ignored: the checkout custom data is set from the session"
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   source: "website"
 *             required: ["variantId"]
 *     responses:
 *       200:
 *         description: "Checkout session created successfully"
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
 *                     checkoutUrl:
 *                       type: string
 *                       format: uri
 *                       description: "LemonSqueezy checkout URL"
 *                       example: "https://checkout.lemonsqueezy.com/checkout/custom/abc123"
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: "User email"
 *                       example: "user@example.com"
 *                     variantId:
 *                       type: string
 *                       description: "Product variant ID"
 *                       example: "123456"
 *                     metadata:
 *                       type: object
 *                       description: "Checkout custom data, set from the session"
 *                       properties:
 *                         userId:
 *                           type: string
 *                           example: "user_123abc"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                 message:
 *                   type: string
 *                   example: "Checkout session created successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 checkoutUrl: "https://checkout.lemonsqueezy.com/checkout/custom/abc123"
 *                 email: "user@example.com"
 *                 variantId: "123456"
 *                 metadata:
 *                   userId: "user_123abc"
 *                   email: "user@example.com"
 *                   name: "John Doe"
 *               message: "Checkout session created successfully"
 *       400:
 *         description: "Bad request - Validation error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: ["VALIDATION_ERROR"]
 *                   example: "VALIDATION_ERROR"
 *                 message:
 *                   type: string
 *                   examples:
 *                     invalid_json: "Invalid JSON in request body"
 *                     validation_failed: "variantId is required"
 *                     invalid_price: "Custom price must be a positive number"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: ["INTERNAL_ERROR", "CONFIGURATION_ERROR"]
 *                   example: "INTERNAL_ERROR"
 *                 message:
 *                   type: string
 *                   examples:
 *                     unauthorized: "Unauthorized"
 *                     config_error: "Checkout service unavailable"
 *                     internal_error: "Failed to create checkout session"
 *       503:
 *         description: "Service unavailable - LemonSqueezy service error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: ["PAYMENT_SERVICE_ERROR"]
 *                   example: "PAYMENT_SERVICE_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Unable to create checkout session"
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json(
				{
					error: 'Unauthorized',
					message: 'Authentication required'
				},
				{ status: HTTP_STATUS.UNAUTHORIZED }
			);
		}
		let body: any;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{
					error: ERROR_TYPES.VALIDATION_ERROR,
					message: 'Invalid JSON in request body'
				} as CreateCheckoutError,
				{ status: HTTP_STATUS.BAD_REQUEST }
			);
		}
		const lemonsqueezyProvider = getOrCreateLemonsqueezyProvider();
		const validation = validateCheckoutRequestBody(body);
		if (!validation.isValid) {
			return NextResponse.json(
				{
					error: ERROR_TYPES.VALIDATION_ERROR,
					message: validation.errors.join(', ')
				} as CreateCheckoutError,
				{ status: HTTP_STATUS.BAD_REQUEST }
			);
		}

		// Only the variant and dark mode come from the body. The variant's own price is charged and
		// the custom data the webhook reads is set from the session (spec 060 R10): a client
		// customPrice, metadata, planId, type or sponsorAdId is never forwarded.
		const checkoutParams = buildLemonSqueezyCheckoutParams(session.user, body);

		// Debug: Log the request parameters (development only, with sanitized PII)
		if (process.env.NODE_ENV === 'development') {
			console.log('[LemonSqueezy Checkout] Creating checkout with:', {
				email: checkoutParams.email ? `${checkoutParams.email.substring(0, 3)}***` : undefined,
				variantId: checkoutParams.variantId,
				dark: checkoutParams.dark
			});
		}

		const checkoutUrl = await lemonsqueezyProvider.createCustomCheckout(checkoutParams);

		const response: CreateCheckoutResponse = {
			success: true,
			data: {
				checkoutUrl,
				email: session.user.email!,
				variantId: checkoutParams.variantId,
				metadata: checkoutParams.metadata
			},
			message: 'Checkout session created successfully'
		};

		return NextResponse.json(response, { status: HTTP_STATUS.OK });
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes('Missing required environment variables')) {
				return NextResponse.json(
					{
						error: ERROR_TYPES.CONFIGURATION_ERROR,
						message: 'Checkout service unavailable'
					} as CreateCheckoutError,
					{ status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
				);
			}

			if (error.message.includes('Invalid email format')) {
				return NextResponse.json(
					{
						error: ERROR_TYPES.VALIDATION_ERROR,
						message: error.message
					} as CreateCheckoutError,
					{ status: HTTP_STATUS.BAD_REQUEST }
				);
			}

			if (error.message.includes('Custom price must be')) {
				return NextResponse.json(
					{
						error: ERROR_TYPES.VALIDATION_ERROR,
						message: error.message
					} as CreateCheckoutError,
					{ status: HTTP_STATUS.BAD_REQUEST }
				);
			}

			if (error.message.includes('Lemonsqueezy')) {
				return NextResponse.json(
					{
						error: ERROR_TYPES.PAYMENT_SERVICE_ERROR,
						message: 'Unable to create checkout session'
					} as CreateCheckoutError,
					{ status: HTTP_STATUS.SERVICE_UNAVAILABLE }
				);
			}
		}

		// Log the actual error for debugging
		console.error('[LemonSqueezy Checkout] Unhandled error:', error);

		return NextResponse.json(
			{
				error: ERROR_TYPES.INTERNAL_ERROR,
				message: 'Failed to create checkout session'
			} as CreateCheckoutError,
			{ status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
		);
	}
}

/**
 * @swagger
 * /api/lemonsqueezy/checkout:
 *   get:
 *     tags: ["LemonSqueezy - Core"]
 *     summary: "Create checkout session via query parameters"
 *     description: "Creates a new LemonSqueezy checkout session using query parameters instead of request body. Useful for direct links and simple integrations. Validates query parameters and creates a custom checkout session. customPrice and metadata are validated but not forwarded: the variant's own price is charged and no client custom data is set (spec 060 R10)."
 *     parameters:
 *       - name: "variantId"
 *         in: "query"
 *         required: true
 *         schema:
 *           type: string
 *         description: "LemonSqueezy product variant ID"
 *         example: "123456"
 *       - name: "email"
 *         in: "query"
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: "Customer email address"
 *         example: "user@example.com"
 *       - name: "customPrice"
 *         in: "query"
 *         required: false
 *         deprecated: true
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: "Ignored: the checkout charges the variant's own price"
 *         example: 2999
 *       - name: "metadata"
 *         in: "query"
 *         required: false
 *         deprecated: true
 *         schema:
 *           type: string
 *         description: "Ignored: no client custom data is forwarded"
 *         example: '{"plan":"pro","source":"website"}'
 *     responses:
 *       200:
 *         description: "Checkout session created successfully"
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
 *                     checkoutUrl:
 *                       type: string
 *                       format: uri
 *                       description: "LemonSqueezy checkout URL"
 *                       example: "https://checkout.lemonsqueezy.com/checkout/custom/abc123"
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: "Customer email"
 *                       example: "user@example.com"
 *                     variantId:
 *                       type: string
 *                       description: "Product variant ID"
 *                       example: "123456"
 *                 message:
 *                   type: string
 *                   example: "Checkout session created successfully"
 *               required: ["success", "data", "message"]
 *       400:
 *         description: "Bad request - Invalid query parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: ["VALIDATION_ERROR"]
 *                   example: "VALIDATION_ERROR"
 *                 message:
 *                   type: string
 *                   example: "variantId is required, email must be valid"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: ["INTERNAL_ERROR", "CONFIGURATION_ERROR"]
 *                   example: "INTERNAL_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Failed to create checkout session"
 *       503:
 *         description: "Service unavailable - LemonSqueezy service error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: ["PAYMENT_SERVICE_ERROR"]
 *                   example: "PAYMENT_SERVICE_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Unable to create checkout session"
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const validation = validateCheckoutQueryParams(searchParams);
		if (!validation.isValid) {
			return NextResponse.json(
				{
					error: ERROR_TYPES.VALIDATION_ERROR,
					message: validation.errors.join(', ')
				} as CreateCheckoutError,
				{ status: HTTP_STATUS.BAD_REQUEST }
			);
		}

		// The query price and metadata are not forwarded (spec 060 R10): the variant's own price is
		// charged and the custom data the webhook reads is never client-supplied.
		const { email, variantId } = validation.data!;
		const lemonsqueezyProvider = PaymentProviderManager.getLemonsqueezyProvider();
		const checkoutUrl = await lemonsqueezyProvider.createCustomCheckout({ email, variantId });

		const response: CreateCheckoutResponse = {
			success: true,
			data: { checkoutUrl, email, variantId },
			message: 'Checkout session created successfully'
		};

		return NextResponse.json(response, { status: HTTP_STATUS.OK });
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes('Missing required environment variables')) {
				return NextResponse.json(
					{
						error: ERROR_TYPES.CONFIGURATION_ERROR,
						message: 'Checkout service unavailable'
					} as CreateCheckoutError,
					{ status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
				);
			}

			if (error.message.includes('Lemonsqueezy')) {
				return NextResponse.json(
					{
						error: ERROR_TYPES.PAYMENT_SERVICE_ERROR,
						message: 'Unable to create checkout session'
					} as CreateCheckoutError,
					{ status: HTTP_STATUS.SERVICE_UNAVAILABLE }
				);
			}
		}

		return NextResponse.json(
			{
				error: ERROR_TYPES.INTERNAL_ERROR,
				message: 'Failed to create checkout session'
			} as CreateCheckoutError,
			{ status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
		);
	}
}
