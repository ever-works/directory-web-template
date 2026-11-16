import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-guard';
import { PaymentProvider } from '@/lib/constants/payment';
import { setupUserPaymentAccount } from '@/lib/db/queries';

// setupUserPaymentAccount creates a payment_provider row for any name it has not seen,
// so only the providers this app ships may reach it.
const SUPPORTED_PROVIDERS: ReadonlySet<string> = new Set(Object.values(PaymentProvider));

/**
 * @swagger
 * /api/payment/account:
 *   post:
 *     tags: ["Payment Accounts"]
 *     summary: "Create payment account"
 *     description: "Admin only (401 without a session, 403 for a signed-in non-admin). Creates a new payment account for a user with a specific payment provider. Links the user to their customer ID in the payment provider's system. The payment providers do not call this route; they write through the database queries."
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 description: "Payment provider name (e.g., 'lemonsqueezy', 'stripe')"
 *                 example: "lemonsqueezy"
 *               userId:
 *                 type: string
 *                 description: "Internal user ID"
 *                 example: "user_123abc"
 *               customerId:
 *                 type: string
 *                 description: "Customer ID from the payment provider"
 *                 example: "cus_456def789ghi"
 *             required: ["provider", "userId", "customerId"]
 *     responses:
 *       200:
 *         description: "Payment account created successfully"
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
 *             example:
 *               id: "pay_acc_123abc"
 *               userId: "user_123abc"
 *               providerId: "lemonsqueezy"
 *               customerId: "cus_456def789ghi"
 *               createdAt: "2024-01-20T10:30:00.000Z"
 *               updatedAt: "2024-01-20T10:30:00.000Z"
 *       400:
 *         description: "Bad request - Missing required fields"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     missing_provider: "Provider is required"
 *                     missing_user: "User ID is required"
 *                     missing_customer: "Customer ID is required"
 *             examples:
 *               missing_provider:
 *                 summary: "Missing provider"
 *                 value:
 *                   error: "Provider is required"
 *               missing_user:
 *                 summary: "Missing user ID"
 *                 value:
 *                   error: "User ID is required"
 *               missing_customer:
 *                 summary: "Missing customer ID"
 *                 value:
 *                   error: "Customer ID is required"
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
export async function POST(request: NextRequest) {
  try {
    // Admin only: the stored customer id is trusted by the billing portal, the invoice list and
    // the Polar ownership check, so a signed-in user must not be able to point their own row at
    // another customer. The providers write rows through the database queries, not this route.
    const adminResult = await requireAdminSession();
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }

    // Parse body explicitly so malformed JSON / wrong content-type
    // returns a clean 400 rather than the generic 500 catch.
    let body: { provider?: unknown; userId?: unknown; customerId?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { provider, userId, customerId } = body;
    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const paymentAccount = await setupUserPaymentAccount(provider, userId, customerId);

    return NextResponse.json({
      id: paymentAccount.id,
      userId: paymentAccount.userId,
      providerId: paymentAccount.providerId,
      customerId: paymentAccount.customerId,
      createdAt: paymentAccount.createdAt,
      updatedAt: paymentAccount.updatedAt
    });

  } catch (error) {
    console.error('Error setting up payment account:', error);
    // Most caller-supplied-data failures here (unknown user / unknown
    // provider / foreign-key violations) are client errors, not server
    // errors. Surface as 400 so unauthenticated probes don't see 5xx.
    return NextResponse.json(
      { error: 'Failed to set up payment account' },
      { status: 400 }
    );
  }
}

/**
 * @swagger
 * /api/payment/account:
 *   put:
 *     tags: ["Payment Accounts"]
 *     summary: "Update payment account"
 *     description: "Admin only (401 without a session, 403 for a signed-in non-admin). Sets the customer ID of a user's payment account for one provider (same write as POST). The row is matched by userId and provider; `id` is required but does not pick the row. This is typically used when a customer ID changes in the payment provider's system."
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Payment account ID (required, but the row is matched by userId and provider)"
 *                 example: "pay_acc_123abc"
 *               provider:
 *                 type: string
 *                 description: "Payment provider name (e.g., 'lemonsqueezy', 'stripe')"
 *                 example: "lemonsqueezy"
 *               userId:
 *                 type: string
 *                 description: "Internal user ID"
 *                 example: "user_123abc"
 *               customerId:
 *                 type: string
 *                 description: "New customer ID from the payment provider"
 *                 example: "cus_789ghi012jkl"
 *             required: ["id", "provider", "userId", "customerId"]
 *     responses:
 *       200:
 *         description: "Payment account updated successfully"
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
 *                   description: "Updated customer ID from the payment provider"
 *                   example: "cus_789ghi012jkl"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: "When the account was originally created"
 *                   example: "2024-01-20T10:30:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: "When the account was last updated"
 *                   example: "2024-01-20T11:45:00.000Z"
 *               required: ["id", "userId", "providerId", "customerId", "createdAt", "updatedAt"]
 *             example:
 *               id: "pay_acc_123abc"
 *               userId: "user_123abc"
 *               providerId: "lemonsqueezy"
 *               customerId: "cus_789ghi012jkl"
 *               createdAt: "2024-01-20T10:30:00.000Z"
 *               updatedAt: "2024-01-20T11:45:00.000Z"
 *       400:
 *         description: "Bad request - Missing required fields"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     missing_id: "Account ID is required"
 *                     missing_provider: "Provider is required"
 *                     missing_user: "User ID is required"
 *                     missing_customer: "Customer ID is required"
 *             examples:
 *               missing_id:
 *                 summary: "Missing account ID"
 *                 value:
 *                   error: "Account ID is required"
 *               missing_provider:
 *                 summary: "Missing provider"
 *                 value:
 *                   error: "Provider is required"
 *               missing_user:
 *                 summary: "Missing user ID"
 *                 value:
 *                   error: "User ID is required"
 *               missing_customer:
 *                 summary: "Missing customer ID"
 *                 value:
 *                   error: "Customer ID is required"
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
export async function PUT(request: NextRequest) {
  try {
    // Admin only, same as POST.
    const adminResult = await requireAdminSession();
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }

    let body: { id?: unknown; provider?: unknown; userId?: unknown; customerId?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { id, provider, userId, customerId } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const paymentAccount = await setupUserPaymentAccount(provider, userId, customerId);

    return NextResponse.json({
      id: paymentAccount.id,
      userId: paymentAccount.userId,
      providerId: paymentAccount.providerId,
      customerId: paymentAccount.customerId,
      createdAt: paymentAccount.createdAt,
      updatedAt: paymentAccount.updatedAt
    });

  } catch (error) {
    console.error('Error updating payment account:', error);
    // Caller-supplied-data failures (unknown user / unknown provider /
    // foreign-key violations) are client errors. Surface as 400.
    return NextResponse.json(
      { error: 'Failed to update payment account' },
      { status: 400 }
    );
  }
}
