import { NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';

/**
 * @swagger
 * /api/stripe/setup-intent:
 *   post:
 *     tags: ["Stripe - Core"]
 *     summary: "Create setup intent"
 *     description: "Creates a new Stripe setup intent for the authenticated user to save payment methods for future use. Automatically creates or retrieves the Stripe customer and prepares for payment method attachment without immediate charge."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Setup intent created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "Setup intent ID"
 *                   example: "seti_1234567890abcdef"
 *                 client_secret:
 *                   type: string
 *                   description: "Client secret for confirming setup"
 *                   example: "seti_1234567890abcdef_secret_xyz"
 *                 status:
 *                   type: string
 *                   enum: ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "canceled", "succeeded"]
 *                   example: "requires_payment_method"
 *                 usage:
 *                   type: string
 *                   enum: ["on_session", "off_session"]
 *                   example: "off_session"
 *                 customer:
 *                   type: string
 *                   description: "Stripe customer ID"
 *                   example: "cus_1234567890abcdef"
 *                 created:
 *                   type: integer
 *                   description: "Unix timestamp of creation"
 *                   example: 1640995200
 *               required: ["id", "client_secret", "status", "usage"]
 *             example:
 *               id: "seti_1234567890abcdef"
 *               client_secret: "seti_1234567890abcdef_secret_xyz"
 *               status: "requires_payment_method"
 *               usage: "off_session"
 *               customer: "cus_1234567890abcdef"
 *               created: 1640995200
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
 *                   example: "Failed to create setup intent"
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const stripeProvider = getOrCreateStripeProvider();

    // Create setup intent
    const setupIntent = await stripeProvider.createSetupIntent(session.user as any);

    return NextResponse.json(setupIntent);
  } catch (error) {
    console.error('Setup intent creation error:', error);
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 });
  }
} 