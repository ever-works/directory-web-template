import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * @swagger
 * /api/stripe/setup-intent/{id}:
 *   get:
 *     tags: ["Stripe - Core"]
 *     summary: "Retrieve setup intent by ID"
 *     description: "Retrieves a specific Stripe setup intent by ID for the authenticated user. Includes security verification to ensure the setup intent belongs to the current user's customer. Returns complete setup intent details including status and payment method information."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe setup intent ID"
 *         example: "seti_1234567890abcdef"
 *     responses:
 *       200:
 *         description: "Setup intent retrieved successfully"
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
 *                       description: "Setup intent ID"
 *                       example: "seti_1234567890abcdef"
 *                     client_secret:
 *                       type: string
 *                       description: "Client secret for confirming setup"
 *                       example: "seti_1234567890abcdef_secret_xyz"
 *                     status:
 *                       type: string
 *                       enum: ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "canceled", "succeeded"]
 *                       example: "succeeded"
 *                     usage:
 *                       type: string
 *                       enum: ["on_session", "off_session"]
 *                       example: "off_session"
 *                     customer:
 *                       type: string
 *                       description: "Stripe customer ID"
 *                       example: "cus_1234567890abcdef"
 *                     payment_method:
 *                       type: string
 *                       nullable: true
 *                       description: "Attached payment method ID"
 *                       example: "pm_1234567890abcdef"
 *                     created:
 *                       type: integer
 *                       description: "Unix timestamp of creation"
 *                       example: 1640995200
 *                     metadata:
 *                       type: object
 *                       description: "Setup intent metadata"
 *                       additionalProperties:
 *                         type: string
 *                   required: ["id", "client_secret", "status", "usage", "customer", "created"]
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 id: "seti_1234567890abcdef"
 *                 client_secret: "seti_1234567890abcdef_secret_xyz"
 *                 status: "succeeded"
 *                 usage: "off_session"
 *                 customer: "cus_1234567890abcdef"
 *                 payment_method: "pm_1234567890abcdef"
 *                 created: 1640995200
 *                 metadata: {}
 *       400:
 *         description: "Bad request - Setup intent ID is required or Stripe error"
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
 *                   example: "Setup intent ID is required"
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
 *       403:
 *         description: "Forbidden - Setup intent does not belong to user"
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
 *                   example: "Unauthorized - setup intent does not belong to user"
 *       404:
 *         description: "Not found - Setup intent or customer not found"
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
 *                   example: "Setup intent not found"
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
 *                   example: "Failed to retrieve setup intent"
 */
// GET - Retrieve a setup intent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } =await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Setup intent ID is required' },
        { status: 400 }
      );
    }

    const stripeProvider = getOrCreateStripeProvider();
		const stripe = stripeProvider.getStripeInstance();

    // Retrieve the setup intent
    const setupIntent = await stripe.setupIntents.retrieve(id);

    // Verify that the setup intent belongs to the current user's customer
    if (setupIntent.customer) {
      const customer = await stripe.customers.retrieve(setupIntent.customer as string);
      
      if (typeof customer === 'string' || customer.deleted) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Check if this customer belongs to the current user
      if (customer.metadata?.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - setup intent does not belong to user' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        status: setupIntent.status,
        usage: setupIntent.usage,
        customer: setupIntent.customer,
        payment_method: setupIntent.payment_method,
        created: setupIntent.created,
        metadata: setupIntent.metadata,
      },
    });

  } catch (error) {
    console.error('Error retrieving setup intent:', error);
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { success: false, error: 'Setup intent not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to retrieve setup intent' },
      { status: 500 }
    );
  }
}
