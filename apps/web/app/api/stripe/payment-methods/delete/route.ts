import { auth, getOrCreateStripeProvider, initializeStripeProvider } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

/**
 * @swagger
 * /api/stripe/payment-methods/delete:
 *   delete:
 *     tags: ["Stripe - Payment Methods"]
 *     summary: "Delete payment method"
 *     description: "Safely deletes a payment method with comprehensive ownership validation, automatic default payment method reassignment, and subscription impact analysis. Handles edge cases like default method deletion and provides detailed response metadata."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 minLength: 1
 *                 description: "Stripe payment method ID to delete"
 *                 example: "pm_1234567890abcdef"
 *             required: ["paymentMethodId"]
 *     responses:
 *       200:
 *         description: "Payment method deleted successfully"
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
 *                   example: "Payment method deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     was_default:
 *                       type: boolean
 *                       description: "Whether the deleted payment method was the default"
 *                       example: true
 *                     affected_subscriptions:
 *                       type: integer
 *                       description: "Number of active subscriptions that were using this payment method"
 *                       example: 2
 *                     new_default_payment_method:
 *                       type: string
 *                       nullable: true
 *                       description: "ID of the new default payment method (if reassigned)"
 *                       example: "pm_0987654321fedcba"
 *                   required: ["was_default", "affected_subscriptions", "new_default_payment_method"]
 *               required: ["success", "message", "data"]
 *             examples:
 *               default_method_deleted:
 *                 summary: "Default payment method deleted with reassignment"
 *                 value:
 *                   success: true
 *                   message: "Payment method deleted successfully"
 *                   data:
 *                     was_default: true
 *                     affected_subscriptions: 1
 *                     new_default_payment_method: "pm_0987654321fedcba"
 *               regular_method_deleted:
 *                 summary: "Regular payment method deleted"
 *                 value:
 *                   success: true
 *                   message: "Payment method deleted successfully"
 *                   data:
 *                     was_default: false
 *                     affected_subscriptions: 0
 *                     new_default_payment_method: null
 *               last_method_deleted:
 *                 summary: "Last payment method deleted"
 *                 value:
 *                   success: true
 *                   message: "Payment method deleted successfully"
 *                   data:
 *                     was_default: true
 *                     affected_subscriptions: 0
 *                     new_default_payment_method: null
 *       400:
 *         description: "Bad request - Invalid request data or payment method issues"
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
 *                         example: "paymentMethodId"
 *                       message:
 *                         type: string
 *                         example: "Payment method ID is required"
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
 *                   example: "Failed to delete payment method"
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const deletePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

// ============================================================================
// TYPES
// ============================================================================

interface DeletePaymentMethodResponse {
  was_default: boolean;
  affected_subscriptions: number;
  new_default_payment_method: string | null;
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
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
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
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
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
 * Handles default payment method reassignment when deleting the current default
 */
async function handleDefaultPaymentMethodReassignment(
  customer: Stripe.Customer,
  paymentMethodId: string
): Promise<string | null> {
  const isDefault = customer.invoice_settings?.default_payment_method === paymentMethodId;

  if (!isDefault) {
    return null;
  }

  try {
    // Get all payment methods for this customer
    const stripeProvider = initializeStripeProvider();
const stripe = stripeProvider.getStripeInstance();
    const otherPaymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    // Filter out the payment method being deleted
    const remainingMethods = otherPaymentMethods.data.filter(pm => pm.id !== paymentMethodId);

    if (remainingMethods.length > 0) {
      // Set the first remaining method as default
      const newDefaultId = remainingMethods[0].id;
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: newDefaultId,
        },
      });
      return newDefaultId;
    } else {
      // Remove default payment method if no other methods exist
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: undefined,
        },
      });
      return null;
    }
  } catch (error) {
    console.error('Error handling default payment method reassignment:', error);
    throw error;
  }
}

/**
 * Checks for active subscriptions that might be affected by payment method deletion
 */
async function checkAffectedSubscriptions(
  customerId: string,
  paymentMethodId: string
): Promise<number> {
  try {
    const stripeProvider = initializeStripeProvider();
const stripe = stripeProvider.getStripeInstance();
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });

    const affectedSubscriptions = subscriptions.data.filter(sub =>
      sub.default_payment_method === paymentMethodId
    );

    return affectedSubscriptions.length;
  } catch (error) {
    console.error('Error checking affected subscriptions:', error);
    return 0; // Return 0 if we can't check, but don't fail the deletion
  }
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

  return NextResponse.json<ApiResponse>(
    { success: false, error: `Failed to ${operation}` },
    { status: 500 }
  );
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * DELETE - Delete a payment method
 * Safely removes a payment method with proper ownership validation and default reassignment
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
    const { paymentMethodId } = deletePaymentMethodSchema.parse(body);

    // Validate payment method ownership
    const ownershipResult = await validatePaymentMethodOwnership(paymentMethodId, userId);
    if (ownershipResult instanceof NextResponse) {
      return ownershipResult;
    }
    const { customer } = ownershipResult;

    // Check if this is the default payment method
    const isDefault = customer.invoice_settings?.default_payment_method === paymentMethodId;

    // Handle default payment method reassignment if necessary
    const newDefaultPaymentMethod = await handleDefaultPaymentMethodReassignment(
      customer,
      paymentMethodId
    );

    // Check for affected subscriptions
    const affectedSubscriptionsCount = await checkAffectedSubscriptions(
      customer.id,
      paymentMethodId
    );

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    // Prepare response data
    const responseData: DeletePaymentMethodResponse = {
      was_default: isDefault,
      affected_subscriptions: affectedSubscriptionsCount,
      new_default_payment_method: newDefaultPaymentMethod,
    };

    return NextResponse.json<ApiResponse<DeletePaymentMethodResponse>>({
      success: true,
      message: 'Payment method deleted successfully',
      data: responseData,
    });

  } catch (error) {
    return handleApiError(error, 'delete payment method');
  }
}
