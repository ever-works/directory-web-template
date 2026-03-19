import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreateStripeProvider } from '@/lib/auth';
import Stripe from 'stripe';

/**
 * @swagger
 * /api/stripe/payment-methods/{id}:
 *   get:
 *     tags: ["Stripe - Payment Methods"]
 *     summary: "Get payment method by ID"
 *     description: "Retrieves a specific payment method by ID for the authenticated user. Includes security verification to ensure the payment method belongs to the current user's customer. Returns detailed payment method information including card details and default status."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe payment method ID"
 *         example: "pm_1234567890abcdef"
 *     responses:
 *       200:
 *         description: "Payment method retrieved successfully"
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
 *                         country:
 *                           type: string
 *                           example: "US"
 *                         fingerprint:
 *                           type: string
 *                           example: "abc123def456"
 *                     billing_details:
 *                       type: object
 *                       description: "Billing details"
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
 *                     customer_id:
 *                       type: string
 *                       description: "Stripe customer ID"
 *                       example: "cus_1234567890abcdef"
 *                   required: ["id", "type", "created", "is_default", "customer_id"]
 *               required: ["success", "data"]
 *       400:
 *         description: "Bad request - Payment method ID required or not associated with customer"
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
 *                     missing_id: "Payment method ID is required"
 *                     no_customer: "Payment method not associated with any customer"
 *                     stripe_error: "Invalid payment method ID"
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
 *                   example: "Unauthorized - payment method does not belong to user"
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
 *                     payment_method: "Payment method not found"
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
 *                   example: "Failed to retrieve payment method"
 */
// GET - Retrieve a specific payment method by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const stripeProvider = getOrCreateStripeProvider();
    const stripe = stripeProvider.getStripeInstance();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the payment method
    const paymentMethod = await stripe.paymentMethods.retrieve(id);

    // Verify that the payment method belongs to the current user's customer
    if (paymentMethod.customer) {
      const customer = await stripe.customers.retrieve(paymentMethod.customer as string);
      
      if (typeof customer === 'string' || customer.deleted) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Check if this customer belongs to the current user
      if (customer.metadata?.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - payment method does not belong to user' },
          { status: 403 }
        );
      }

      // Check if this is the default payment method
      const isDefault = customer.invoice_settings?.default_payment_method === id;

      // Format response with additional details
      const formattedPaymentMethod = {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          funding: paymentMethod.card.funding,
          country: paymentMethod.card.country,
          fingerprint: paymentMethod.card.fingerprint,
        } : null,
        billing_details: paymentMethod.billing_details,
        created: paymentMethod.created,
        metadata: paymentMethod.metadata,
        is_default: isDefault,
        customer_id: customer.id,
      };

      return NextResponse.json({
        success: true,
        data: formattedPaymentMethod,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Payment method not associated with any customer' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error retrieving payment method:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { success: false, error: 'Payment method not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to retrieve payment method' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/stripe/payment-methods/{id}:
 *   delete:
 *     tags: ["Stripe - Payment Methods"]
 *     summary: "Delete payment method by ID"
 *     description: "Deletes a specific payment method by ID for the authenticated user. Includes security verification and automatic default payment method reassignment if the deleted method was the default."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe payment method ID to delete"
 *         example: "pm_1234567890abcdef"
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
 *               required: ["success", "message", "data"]
 *             example:
 *               success: true
 *               message: "Payment method deleted successfully"
 *               data:
 *                 was_default: true
 *       400:
 *         description: "Bad request - Payment method ID required or not associated with customer"
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
 *                     missing_id: "Payment method ID is required"
 *                     no_customer: "Payment method not associated with a customer"
 *                     stripe_error: "Invalid payment method ID"
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
 *                   example: "Unauthorized - payment method does not belong to user"
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
 *                     payment_method: "Payment method not found"
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
// DELETE - Delete a specific payment method by ID (alternative endpoint)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const stripeProvider = getOrCreateStripeProvider();
    const stripe = stripeProvider.getStripeInstance();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get the payment method to verify ownership
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    
    if (!paymentMethod.customer) {
      return NextResponse.json(
        { success: false, error: 'Payment method not associated with a customer' },
        { status: 400 }
      );
    }

    // Verify that the payment method belongs to the current user's customer
    const customer = await stripe.customers.retrieve(paymentMethod.customer as string);
    
    if (typeof customer === 'string' || customer.deleted) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if this customer belongs to the current user
    if (customer.metadata?.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - payment method does not belong to user' },
        { status: 403 }
      );
    }

    // Check if this is the default payment method
    const isDefault = customer.invoice_settings?.default_payment_method === id;
    
    // If it's the default and there are other payment methods, set a new default
    if (isDefault) {
      const otherPaymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card',
      });
      
      const remainingMethods = otherPaymentMethods.data.filter(pm => pm.id !== id);
      
      if (remainingMethods.length > 0) {
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: remainingMethods[0].id,
          },
        });
      } else {
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: undefined,
          },
        });
      }
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(id);

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
      data: {
        was_default: isDefault,
      },
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { success: false, error: 'Payment method not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
