import { auth, getOrCreateStripeProvider, initializeStripeProvider } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

/**
 * @swagger
 * /api/stripe/payment-methods/update:
 *   put:
 *     tags: ["Stripe - Payment Methods"]
 *     summary: "Update payment method"
 *     description: "Updates a payment method's billing details, metadata, and optionally sets it as the default payment method. Includes comprehensive ownership validation and detailed error handling."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method_id:
 *                 type: string
 *                 minLength: 1
 *                 description: "Stripe payment method ID to update"
 *                 example: "pm_1234567890abcdef"
 *               metadata:
 *                 type: object
 *                 description: "Additional metadata for the payment method"
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   nickname: "Primary Card"
 *                   category: "business"
 *               billing_details:
 *                 type: object
 *                 description: "Billing details to update"
 *                 properties:
 *                   name:
 *                     type: string
 *                     minLength: 1
 *                     description: "Cardholder name"
 *                     example: "John Doe"
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: "Billing email address"
 *                     example: "john@example.com"
 *                   phone:
 *                     type: string
 *                     description: "Phone number"
 *                     example: "+1234567890"
 *                   address:
 *                     type: object
 *                     description: "Billing address"
 *                     properties:
 *                       line1:
 *                         type: string
 *                         description: "Address line 1"
 *                         example: "123 Main St"
 *                       line2:
 *                         type: string
 *                         description: "Address line 2"
 *                         example: "Apt 4B"
 *                       city:
 *                         type: string
 *                         description: "City"
 *                         example: "New York"
 *                       state:
 *                         type: string
 *                         description: "State/Province"
 *                         example: "NY"
 *                       postal_code:
 *                         type: string
 *                         description: "Postal/ZIP code"
 *                         example: "10001"
 *                       country:
 *                         type: string
 *                         minLength: 2
 *                         maxLength: 2
 *                         description: "2-letter country code"
 *                         example: "US"
 *               set_as_default:
 *                 type: boolean
 *                 description: "Whether to set this payment method as default"
 *                 example: true
 *             required: ["payment_method_id"]
 *     responses:
 *       200:
 *         description: "Payment method updated successfully"
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
 *                       description: "Payment method ID"
 *                       example: "pm_1234567890abcdef"
 *                     type:
 *                       type: string
 *                       description: "Payment method type"
 *                       example: "card"
 *                     card:
 *                       type: object
 *                       nullable: true
 *                       description: "Card details (if type is card)"
 *                       properties:
 *                         brand:
 *                           type: string
 *                           example: "visa"
 *                         last4:
 *                           type: string
 *                           example: "4242"
 *                         funding:
 *                           type: string
 *                           enum: ["credit", "debit", "prepaid", "unknown"]
 *                           example: "credit"
 *                     billing_details:
 *                       type: object
 *                       description: "Updated billing details"
 *                       properties:
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           nullable: true
 *                           example: "john@example.com"
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                           example: "+1234567890"
 *                         address:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             line1:
 *                               type: string
 *                               nullable: true
 *                               example: "123 Main St"
 *                             city:
 *                               type: string
 *                               nullable: true
 *                               example: "New York"
 *                             state:
 *                               type: string
 *                               nullable: true
 *                               example: "NY"
 *                             postal_code:
 *                               type: string
 *                               nullable: true
 *                               example: "10001"
 *                             country:
 *                               type: string
 *                               nullable: true
 *                               example: "US"
 *                     created:
 *                       type: integer
 *                       description: "Unix timestamp of creation"
 *                       example: 1640995200
 *                     metadata:
 *                       type: object
 *                       description: "Payment method metadata"
 *                       additionalProperties:
 *                         type: string
 *                     is_default:
 *                       type: boolean
 *                       description: "Whether this is the default payment method"
 *                       example: true
 *                   required: ["id", "type", "created"]
 *                 message:
 *                   type: string
 *                   example: "Payment method updated successfully"
 *               required: ["success", "data", "message"]
 *       400:
 *         description: "Bad request - Invalid request data or Stripe error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   examples:
 *                     validation: "Invalid request data"
 *                     no_customer: "Payment method not associated with a customer"
 *                     stripe_error: "Stripe error: Invalid payment method ID"
 *                 details:
 *                   type: array
 *                   description: "Validation error details (if applicable)"
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                         example: "billing_details.email"
 *                       message:
 *                         type: string
 *                         example: "Invalid email format"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Authentication required"
 *       403:
 *         description: "Forbidden - Payment method does not belong to user"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Access denied: payment method does not belong to user"
 *       404:
 *         description: "Not found - Payment method or customer not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   examples:
 *                     payment_method: "Stripe error: No such payment method"
 *                     customer: "Customer not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to update payment method"
 *   patch:
 *     tags: ["Stripe - Payment Methods"]
 *     summary: "Set payment method as default"
 *     description: "Sets the specified payment method as the default for the customer. Simpler endpoint focused only on default status change."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method_id:
 *                 type: string
 *                 minLength: 1
 *                 description: "Stripe payment method ID to set as default"
 *                 example: "pm_1234567890abcdef"
 *             required: ["payment_method_id"]
 *     responses:
 *       200:
 *         description: "Payment method set as default successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment method set as default successfully"
 *               required: ["success", "message"]
 *       400:
 *         description: "Bad request - Invalid request data or Stripe error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   examples:
 *                     validation: "Invalid request data"
 *                     stripe_error: "Stripe error: Invalid payment method ID"
 *       401:
 *         description: "Unauthorized - Authentication required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Authentication required"
 *       403:
 *         description: "Forbidden - Payment method does not belong to user"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Access denied: payment method does not belong to user"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to set default payment method"
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updatePaymentMethodSchema = z.object({
	payment_method_id: z.string().min(1, 'Payment method ID is required'),
	metadata: z.record(z.string(), z.string()).optional(),
	billing_details: z
		.object({
			name: z.string().min(1, 'Name cannot be empty').optional(),
			email: z.string().email({ message: 'Invalid email format' }).optional(),
			phone: z.string().optional(),
			address: z
				.object({
					line1: z.string().optional(),
					line2: z.string().optional(),
					city: z.string().optional(),
					state: z.string().optional(),
					postal_code: z.string().optional(),
					country: z.string().length(2, 'Country must be a 2-letter code').optional()
				})
				.optional()
		})
		.optional(),
	set_as_default: z.boolean().optional()
});

const setDefaultPaymentMethodSchema = z.object({
	payment_method_id: z.string().min(1, 'Payment method ID is required')
});

// ============================================================================
// TYPES
// ============================================================================

interface PaymentMethodResponse {
	id: string;
	type: string;
	card: {
		brand: string;
		last4: string;
		funding: string;
	} | null;
	billing_details: Stripe.PaymentMethod.BillingDetails | null;
	created: number;
	metadata: Stripe.Metadata | null;
	is_default?: boolean;
}

interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	details?: any;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates user session and returns user ID
 */
async function validateSession(): Promise<{ userId: string } | NextResponse> {
	const session = await auth();

	if (!session?.user?.id) {
		return NextResponse.json<ApiResponse>({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	return { userId: session.user.id };
}

/**
 * Validates payment method ownership
 */
async function validatePaymentMethodOwnership(
	paymentMethodId: string,
	userId: string
): Promise<{ paymentMethod: Stripe.PaymentMethod; customer: Stripe.Customer } | NextResponse> {
	try {
		const stripeProvider = getOrCreateStripeProvider();
		const stripe = stripeProvider.getStripeInstance();
		// Retrieve payment method
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

		if (!paymentMethod.customer) {
			return NextResponse.json<ApiResponse>(
				{ success: false, error: 'Payment method not associated with a customer' },
				{ status: 400 }
			);
		}

		// Retrieve customer
		const customer = await stripe.customers.retrieve(paymentMethod.customer as string);

		if (typeof customer === 'string' || customer.deleted) {
			return NextResponse.json<ApiResponse>({ success: false, error: 'Customer not found' }, { status: 404 });
		}

		// Verify ownership
		if (customer.metadata?.userId !== userId) {
			return NextResponse.json<ApiResponse>(
				{ success: false, error: 'Access denied: payment method does not belong to user' },
				{ status: 403 }
			);
		}

		return { paymentMethod, customer };
	} catch (error) {
		if (error instanceof Stripe.errors.StripeError) {
			return NextResponse.json<ApiResponse>(
				{ success: false, error: `Stripe error: ${error.message}` },
				{ status: 400 }
			);
		}
		throw error;
	}
}

/**
 * Formats payment method for API response
 */
function formatPaymentMethodResponse(paymentMethod: Stripe.PaymentMethod, isDefault = false): PaymentMethodResponse {
	return {
		id: paymentMethod.id,
		type: paymentMethod.type,
		card: paymentMethod.card
			? {
					brand: paymentMethod.card.brand,
					last4: paymentMethod.card.last4,
					funding: paymentMethod.card.funding
				}
			: null,
		billing_details: paymentMethod.billing_details,
		created: paymentMethod.created,
		metadata: paymentMethod.metadata,
		is_default: isDefault
	};
}

/**
 * Handles API errors consistently
 */
function handleApiError(error: unknown, operation: string): NextResponse {
	console.error(`Error in ${operation}:`, error);

	if (error instanceof z.ZodError) {
		return NextResponse.json<ApiResponse>(
			{
				success: false,
				error: 'Invalid request data',
				details: error.issues.map((issue) => ({
					path: issue.path.join('.'),
					message: issue.message
				}))
			},
			{ status: 400 }
		);
	}

	if (error instanceof Stripe.errors.StripeError) {
		const statusCode = error.statusCode || 400;
		return NextResponse.json<ApiResponse>(
			{ success: false, error: `Stripe error: ${error.message}` },
			{ status: statusCode }
		);
	}

	return NextResponse.json<ApiResponse>({ success: false, error: `Failed to ${operation}` }, { status: 500 });
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * PUT - Update a payment method
 * Updates billing details, card information, and optionally sets as default
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
	try {
		// Validate session
		const sessionResult = await validateSession();
		if (sessionResult instanceof NextResponse) {
			return sessionResult;
		}
		const stripeProvider = initializeStripeProvider();
		const stripe = stripeProvider.getStripeInstance();
		const { userId } = sessionResult;

		// Parse and validate request body
		const body = await request.json();
		const validatedData = updatePaymentMethodSchema.parse(body);
		const { payment_method_id, metadata, billing_details, set_as_default } = validatedData;

		// Validate payment method ownership
		const ownershipResult = await validatePaymentMethodOwnership(payment_method_id, userId);
		if (ownershipResult instanceof NextResponse) {
			return ownershipResult;
		}
		const { paymentMethod, customer } = ownershipResult;

		// Prepare update data
		const updateData: Stripe.PaymentMethodUpdateParams = {};

		// Update metadata if provided
		if (metadata) {
			updateData.metadata = {
				...paymentMethod.metadata,
				...metadata,
				userId // Ensure userId is always present
			};
		}

		// Update billing details if provided
		if (billing_details) {
			updateData.billing_details = billing_details;
		}


		// Update the payment method
		const updatedPaymentMethod = await stripe.paymentMethods.update(payment_method_id, updateData);

		// Set as default if requested
		let isDefault = false;
		if (set_as_default) {
			await stripe.customers.update(customer.id, {
				invoice_settings: {
					default_payment_method: payment_method_id
				}
			});
			isDefault = true;
		}

		// Format and return response
		const formattedPaymentMethod = formatPaymentMethodResponse(updatedPaymentMethod, isDefault);

		return NextResponse.json<ApiResponse<PaymentMethodResponse>>({
			success: true,
			data: formattedPaymentMethod,
			message: 'Payment method updated successfully'
		});
	} catch (error) {
		return handleApiError(error, 'update payment method');
	}
}

/**
 * PATCH - Set payment method as default
 * Sets the specified payment method as the default for the customer
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
	try {
		// Validate session
		const sessionResult = await validateSession();
		if (sessionResult instanceof NextResponse) {
			return sessionResult;
		}

		const { userId } = sessionResult;
		const stripeProvider = initializeStripeProvider();
		const stripe = stripeProvider.getStripeInstance();
		// Parse and validate request body
		const body = await request.json();
		const { payment_method_id } = setDefaultPaymentMethodSchema.parse(body);

		// Validate payment method ownership
		const ownershipResult = await validatePaymentMethodOwnership(payment_method_id, userId);
		if (ownershipResult instanceof NextResponse) {
			return ownershipResult;
		}
		const { customer } = ownershipResult;

		// Set as default payment method
		await stripe.customers.update(customer.id, {
			invoice_settings: {
				default_payment_method: payment_method_id
			}
		});

		return NextResponse.json<ApiResponse>({
			success: true,
			message: 'Payment method set as default successfully'
		});
	} catch (error) {
		return handleApiError(error, 'set default payment method');
	}
}
