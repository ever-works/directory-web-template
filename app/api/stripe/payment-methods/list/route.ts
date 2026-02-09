import { NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import Stripe from 'stripe';
import { getUserStripeCustomerId } from '@/lib/stripe-helpers';
import { safeErrorMessage } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/stripe/payment-methods/list:
 *   get:
 *     tags: ["Stripe - Payment Methods"]
 *     summary: "List user payment methods"
 *     description: "Retrieves all payment methods for the authenticated user. Returns formatted payment method data sorted by default status and creation date. Includes comprehensive metadata and card details."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Payment methods retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: "Array of payment methods (sorted by default status, then creation date)"
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: "Payment method ID"
 *                         example: "pm_1234567890abcdef"
 *                       type:
 *                         type: string
 *                         description: "Payment method type"
 *                         example: "card"
 *                       card:
 *                         type: object
 *                         nullable: true
 *                         description: "Card details (if type is card)"
 *                         properties:
 *                           brand:
 *                             type: string
 *                             example: "visa"
 *                           last4:
 *                             type: string
 *                             example: "4242"
 *                           funding:
 *                             type: string
 *                             enum: ["credit", "debit", "prepaid", "unknown"]
 *                             example: "credit"
 *                           country:
 *                             type: string
 *                             example: "US"
 *                       billing_details:
 *                         type: object
 *                         description: "Billing details"
 *                         properties:
 *                           name:
 *                             type: string
 *                             nullable: true
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             nullable: true
 *                             example: "john@example.com"
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                             example: "+1234567890"
 *                           address:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               line1:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "123 Main St"
 *                               city:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "New York"
 *                               state:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "NY"
 *                               postal_code:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "10001"
 *                               country:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "US"
 *                       created:
 *                         type: integer
 *                         description: "Unix timestamp of creation"
 *                         example: 1640995200
 *                       metadata:
 *                         type: object
 *                         description: "Payment method metadata"
 *                         additionalProperties:
 *                           type: string
 *                       is_default:
 *                         type: boolean
 *                         description: "Whether this is the default payment method"
 *                         example: true
 *                     required: ["id", "type", "created", "is_default"]
 *                 meta:
 *                   type: object
 *                   description: "Response metadata"
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: "Total number of payment methods"
 *                       example: 3
 *                     default_payment_method:
 *                       type: string
 *                       nullable: true
 *                       description: "Default payment method ID"
 *                       example: "pm_1234567890abcdef"
 *                     customer_id:
 *                       type: string
 *                       description: "Stripe customer ID"
 *                       example: "cus_1234567890abcdef"
 *                   required: ["total", "customer_id"]
 *                 message:
 *                   type: string
 *                   description: "Optional message when no payment methods are found"
 *                   example: "No payment methods found"
 *               required: ["success", "data"]
 *             examples:
 *               with_payment_methods:
 *                 summary: "User with payment methods"
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: "pm_1234567890abcdef"
 *                       type: "card"
 *                       card:
 *                         brand: "visa"
 *                         last4: "4242"
 *                         funding: "credit"
 *                         country: "US"
 *                       billing_details:
 *                         name: "John Doe"
 *                         email: "john@example.com"
 *                       created: 1640995200
 *                       metadata: {}
 *                       is_default: true
 *                     - id: "pm_0987654321fedcba"
 *                       type: "card"
 *                       card:
 *                         brand: "mastercard"
 *                         last4: "1234"
 *                         funding: "credit"
 *                         country: "US"
 *                       billing_details:
 *                         name: "John Doe"
 *                       created: 1640908800
 *                       metadata: {}
 *                       is_default: false
 *                   meta:
 *                     total: 2
 *                     default_payment_method: "pm_1234567890abcdef"
 *                     customer_id: "cus_1234567890abcdef"
 *               no_payment_methods:
 *                 summary: "User with no payment methods"
 *                 value:
 *                   success: true
 *                   data: []
 *                   message: "No payment methods found"
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
 *                   example: "Unauthorized"
 *       404:
 *         description: "Customer not found"
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
 *                   example: "Customer not found"
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
 *                   example: "Failed to list payment methods"
 */
// GET - List all payment methods for the current user
export async function GET() {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const stripeProvider = getOrCreateStripeProvider();
		const stripe = stripeProvider.getStripeInstance();

		const stripeCustomerId = await getUserStripeCustomerId(session.user.id, stripe);

		if (!stripeCustomerId) {
			return NextResponse.json({
				success: true,
				data: [],
				message: 'No payment methods found'
			});
		}


		const customer = await stripe.customers.retrieve(stripeCustomerId);
		if (typeof customer === 'string' || customer.deleted) {
			return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
		}

		const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

		// List all payment methods for the customer
		const paymentMethods = await stripe.paymentMethods.list({
			customer: stripeCustomerId,
			type: 'card',
			limit: 100 // Adjust as needed
		});

		const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
			id: pm.id,
			type: pm.type,
			card: pm.card
				? {
						brand: pm.card.brand,
						last4: pm.card.last4,
						funding: pm.card.funding,
						country: pm.card.country
					}
				: null,
			billing_details: pm.billing_details,
			created: pm.created,
			metadata: pm.metadata,
			is_default: pm.id === defaultPaymentMethodId
		}));

		formattedPaymentMethods.sort((a, b) => {
			if (a.is_default && !b.is_default) return -1;
			if (!a.is_default && b.is_default) return 1;
			return b.created - a.created;
		});

		return NextResponse.json({
			success: true,
			data: formattedPaymentMethods,
			meta: {
				total: formattedPaymentMethods.length,
				default_payment_method: defaultPaymentMethodId,
				customer_id: stripeCustomerId
			}
		});
	} catch (error) {
		console.error('Error listing payment methods:', error);

		if (error instanceof Stripe.errors.StripeError) {
			const msg = safeErrorMessage(error, 'Stripe request failed');
			return NextResponse.json({ success: false, error: msg }, { status: 400 });
		}

		return NextResponse.json({ success: false, error: 'Failed to list payment methods' }, { status: 500 });
	}
}


