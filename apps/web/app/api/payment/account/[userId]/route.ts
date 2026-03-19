import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPaymentAccountByProvider } from '@/lib/db/queries';

/**
 * @swagger
 * /api/payment/account/{userId}:
 *   get:
 *     tags: ["Payment Accounts"]
 *     summary: "Get user payment account"
 *     description: "Retrieves a user's payment account information for a specific payment provider. Returns the account details including customer ID and timestamps. Requires authentication and the requesting user must own the account."
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: "userId"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Internal user ID"
 *         example: "user_123abc"
 *       - name: "provider"
 *         in: "query"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Payment provider name (e.g., 'lemonsqueezy', 'stripe')"
 *         example: "lemonsqueezy"
 *     responses:
 *       200:
 *         description: "Payment account retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: "Payment account ID"
 *                   example: "pay_acc_123abc"
 *                 userId:
 *                   type: string
 *                   description: "Internal user ID"
 *                   example: "user_123abc"
 *                 providerId:
 *                   type: string
 *                   description: "Payment provider identifier"
 *                   example: "lemonsqueezy"
 *                 customerId:
 *                   type: string
 *                   description: "Customer ID from the payment provider"
 *                   example: "cus_456def789ghi"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: "When the account was created"
 *                   example: "2024-01-20T10:30:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: "When the account was last updated"
 *                   example: "2024-01-20T10:30:00.000Z"
 *               required: ["id", "userId", "providerId", "customerId", "createdAt", "updatedAt"]
 *             examples:
 *               lemonsqueezy_account:
 *                 summary: "LemonSqueezy payment account"
 *                 value:
 *                   id: "pay_acc_123abc"
 *                   userId: "user_123abc"
 *                   providerId: "lemonsqueezy"
 *                   customerId: "cus_456def789ghi"
 *                   createdAt: "2024-01-20T10:30:00.000Z"
 *                   updatedAt: "2024-01-20T10:30:00.000Z"
 *               stripe_account:
 *                 summary: "Stripe payment account"
 *                 value:
 *                   id: "pay_acc_789ghi"
 *                   userId: "user_123abc"
 *                   providerId: "stripe"
 *                   customerId: "cus_stripe_012jkl"
 *                   createdAt: "2024-01-19T15:20:00.000Z"
 *                   updatedAt: "2024-01-19T15:20:00.000Z"
 *       401:
 *         description: "Unauthorized - Not authenticated"
 *       403:
 *         description: "Forbidden - Cannot access another user's payment account"
 *       400:
 *         description: "Bad request - Missing required parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     missing_user: "User ID is required"
 *                     missing_provider: "Provider is required"
 *             examples:
 *               missing_user:
 *                 summary: "Missing user ID"
 *                 value:
 *                   error: "User ID is required"
 *               missing_provider:
 *                 summary: "Missing provider"
 *                 value:
 *                   error: "Provider is required"
 *       404:
 *         description: "Payment account not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Payment account not found"
 *             example:
 *               error: "Payment account not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Authenticate user and verify ownership
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent accessing other users' payment accounts
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    const paymentAccount = await getUserPaymentAccountByProvider(userId, provider);

    if (!paymentAccount) {
      return NextResponse.json(
        { error: 'Payment account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: paymentAccount.id,
      userId: paymentAccount.userId,
      providerId: paymentAccount.providerId,
      customerId: paymentAccount.customerId,
      createdAt: paymentAccount.createdAt,
      updatedAt: paymentAccount.updatedAt
    });

  } catch (error) {
    console.error('Error fetching payment account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
