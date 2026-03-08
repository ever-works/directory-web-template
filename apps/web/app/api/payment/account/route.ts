import { NextRequest, NextResponse } from 'next/server';
import { setupUserPaymentAccount } from '@/lib/db/queries';

/**
 * @swagger
 * /api/payment/account:
 *   post:
 *     tags: ["Payment Accounts"]
 *     summary: "Create payment account"
 *     description: "Creates a new payment account for a user with a specific payment provider. Links the user to their customer ID in the payment provider's system. This is typically called after a successful customer creation in the payment provider."
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
    const body = await request.json();
    const { provider, userId, customerId } = body;
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!customerId) {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/payment/account:
 *   put:
 *     tags: ["Payment Accounts"]
 *     summary: "Update payment account"
 *     description: "Updates an existing payment account with new provider or customer information. Requires the account ID to identify which account to update. This is typically used when a customer ID changes in the payment provider's system."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Payment account ID to update"
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
    const body = await request.json();
    const { id, provider, userId, customerId } = body;
    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!customerId) {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
