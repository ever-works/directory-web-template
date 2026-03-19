import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';

/**
 * @swagger
 * /api/stripe/payment-intent:
 *   post:
 *     tags: ["Stripe - Core"]
 *     summary: "Create payment intent"
 *     description: "Creates a new Stripe payment intent for the authenticated user. Automatically creates or retrieves the Stripe customer and associates the payment with user metadata. Used for direct payment processing without checkout sessions."
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
 *                 type: integer
 *                 minimum: 50
 *                 description: "Payment amount in cents"
 *                 example: 2999
 *               currency:
 *                 type: string
 *                 default: "usd"
 *                 description: "Payment currency (ISO 4217)"
 *                 example: "usd"
 *               planId:
 *                 type: string
 *                 description: "Plan identifier for metadata"
 *                 example: "pro_plan"
 *               metadata:
 *                 type: object
 *                 description: "Additional metadata for the payment"
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   feature: "premium_access"
 *                   source: "website"
 *             required: ["amount"]
 *     responses:
 *       200:
 *         description: "Payment intent created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "Payment intent ID"
 *                   example: "pi_1234567890abcdef"
 *                 client_secret:
 *                   type: string
 *                   description: "Client secret for confirming payment"
 *                   example: "pi_1234567890abcdef_secret_xyz"
 *                 status:
 *                   type: string
 *                   enum: ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "canceled", "succeeded"]
 *                   example: "requires_payment_method"
 *                 amount:
 *                   type: integer
 *                   description: "Payment amount in cents"
 *                   example: 2999
 *                 currency:
 *                   type: string
 *                   description: "Payment currency"
 *                   example: "usd"
 *                 customer:
 *                   type: string
 *                   description: "Stripe customer ID"
 *                   example: "cus_1234567890abcdef"
 *               required: ["id", "client_secret", "status", "amount", "currency"]
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
 *                   example: "Failed to create payment intent"
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency = 'usd', metadata, planId } = await request.json();

    // Get or create Stripe provider (singleton)
    const stripeProvider = getOrCreateStripeProvider();
    // Get or create customer
    const customerId = await stripeProvider.getCustomerId(session.user as any);
    
    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripeProvider.createPaymentIntent({
      amount,
      currency,
      customerId,
      metadata: {
        userId: session.user.id,
        planId,
        ...metadata
      }
    });

    return NextResponse.json(paymentIntent);
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/stripe/payment-intent:
 *   get:
 *     tags: ["Stripe - Core"]
 *     summary: "Verify payment intent"
 *     description: "Verifies a Stripe payment intent by ID and returns the payment verification status. Used to confirm payment completion and retrieve payment details after processing."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "payment_intent_id"
 *         in: "query"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe payment intent ID"
 *         example: "pi_1234567890abcdef"
 *     responses:
 *       200:
 *         description: "Payment verification completed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: "Whether payment was successful"
 *                   example: true
 *                 status:
 *                   type: string
 *                   enum: ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "canceled", "succeeded"]
 *                   example: "succeeded"
 *                 payment_intent:
 *                   type: object
 *                   description: "Payment intent details"
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "pi_1234567890abcdef"
 *                     amount:
 *                       type: integer
 *                       example: 2999
 *                     currency:
 *                       type: string
 *                       example: "usd"
 *                     status:
 *                       type: string
 *                       example: "succeeded"
 *                     customer:
 *                       type: string
 *                       example: "cus_1234567890abcdef"
 *                 message:
 *                   type: string
 *                   description: "Verification message"
 *                   example: "Payment completed successfully"
 *               required: ["success", "status"]
 *       400:
 *         description: "Bad request - Payment intent ID required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Payment intent ID required"
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
 *                   example: "Failed to verify payment"
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent_id');

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 });
    }

    // Get or create Stripe provider (singleton)
    const stripeProvider = getOrCreateStripeProvider();

    // Verify payment
    const verification = await stripeProvider.verifyPayment(paymentIntentId);

    return NextResponse.json(verification);
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
} 