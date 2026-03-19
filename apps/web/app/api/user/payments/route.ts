import { NextResponse } from 'next/server';
import { auth, initializeStripeProvider } from '@/lib/auth';

/**
 * @swagger
 * /api/user/payments:
 *   get:
 *     tags: ["User"]
 *     summary: "Get user payment history"
 *     description: "Retrieves comprehensive payment history for the authenticated user from Stripe, including invoices, subscription details, and billing information. Returns detailed payment records with plan information and invoice links."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Payment history retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: "Stripe invoice ID"
 *                     example: "in_1234567890abcdef"
 *                   date:
 *                     type: string
 *                     format: date-time
 *                     description: "Payment date in ISO format"
 *                     example: "2024-01-15T10:30:00.000Z"
 *                   amount:
 *                     type: number
 *                     description: "Payment amount (in major currency units)"
 *                     example: 29.99
 *                   currency:
 *                     type: string
 *                     description: "Currency code (uppercase)"
 *                     example: "USD"
 *                   plan:
 *                     type: string
 *                     description: "Plan name"
 *                     example: "Premium Plan"
 *                   planId:
 *                     type: string
 *                     description: "Plan identifier"
 *                     example: "pro"
 *                   status:
 *                     type: string
 *                     enum: ["Paid", "Pending", "Draft", "Unknown"]
 *                     description: "Payment status"
 *                     example: "Paid"
 *                   billingInterval:
 *                     type: string
 *                     enum: ["monthly", "yearly", "weekly", "daily"]
 *                     description: "Billing frequency"
 *                     example: "monthly"
 *                   paymentProvider:
 *                     type: string
 *                     enum: ["stripe"]
 *                     description: "Payment provider"
 *                     example: "stripe"
 *                   subscriptionId:
 *                     type: string
 *                     nullable: true
 *                     description: "Associated subscription ID (empty string if no subscription)"
 *                     example: "sub_1234567890abcdef"
 *                   description:
 *                     type: string
 *                     description: "Payment description"
 *                     example: "Premium Plan - monthly billing"
 *                   invoiceUrl:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                     description: "Hosted invoice URL"
 *                     example: "https://invoice.stripe.com/i/acct_123/test_abc"
 *                   invoicePdf:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                     description: "Invoice PDF URL"
 *                     example: "https://pay.stripe.com/invoice/acct_123/test_abc/pdf"
 *                   invoiceNumber:
 *                     type: string
 *                     nullable: true
 *                     description: "Invoice number"
 *                     example: "INV-2024-001"
 *                   period_end:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     description: "Billing period end date"
 *                     example: "2024-02-15T10:30:00.000Z"
 *                   period_start:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     description: "Billing period start date"
 *                     example: "2024-01-15T10:30:00.000Z"
 *                 required: ["id", "date", "amount", "currency", "plan", "status", "billingInterval", "paymentProvider", "description"]
 *             examples:
 *               with_payments:
 *                 summary: "User with payment history"
 *                 value:
 *                   - id: "in_1234567890abcdef"
 *                     date: "2024-01-15T10:30:00.000Z"
 *                     amount: 29.99
 *                     currency: "USD"
 *                     plan: "Premium Plan"
 *                     planId: "pro"
 *                     status: "Paid"
 *                     billingInterval: "monthly"
 *                     paymentProvider: "stripe"
 *                     subscriptionId: "sub_1234567890abcdef"
 *                     description: "Premium Plan - monthly billing"
 *                     invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_abc"
 *                     invoicePdf: "https://pay.stripe.com/invoice/acct_123/test_abc/pdf"
 *                     invoiceNumber: "INV-2024-001"
 *                     period_end: "2024-02-15T10:30:00.000Z"
 *                     period_start: "2024-01-15T10:30:00.000Z"
 *                   - id: "in_0987654321fedcba"
 *                     date: "2023-12-15T10:30:00.000Z"
 *                     amount: 29.99
 *                     currency: "USD"
 *                     plan: "Premium Plan"
 *                     planId: "pro"
 *                     status: "Paid"
 *                     billingInterval: "monthly"
 *                     paymentProvider: "stripe"
 *                     subscriptionId: "sub_1234567890abcdef"
 *                     description: "Premium Plan - monthly billing"
 *                     invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_def"
 *                     invoicePdf: "https://pay.stripe.com/invoice/acct_123/test_def/pdf"
 *                     invoiceNumber: "INV-2023-012"
 *                     period_end: "2024-01-15T10:30:00.000Z"
 *                     period_start: "2023-12-15T10:30:00.000Z"
 *               empty_history:
 *                 summary: "User with no payment history"
 *                 value: []
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
 *                   example: "Failed to fetch payment data"
 *     x-data-sources:
 *       description: "Data sources and processing"
 *       sources:
 *         - "Stripe Invoices API"
 *         - "Stripe Subscriptions API"
 *       processing:
 *         - "Filters paid and open invoices only"
 *         - "Enriches with subscription metadata"
 *         - "Sorts by date (newest first)"
 *         - "Converts amounts from cents to major units"
 *         - "Provides invoice URLs and PDF links"
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Stripe provider
    const stripeProvider = initializeStripeProvider();
		const stripe = stripeProvider.getStripeInstance();
    // Get or create customer ID
    const customerId = await stripeProvider.getCustomerId(session.user as any);
    
    if (!customerId) {
      return NextResponse.json([]);
    }

    try {
      // Fetch all invoices for this customer
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100
      });

      // Fetch all subscriptions for additional context (reduced expansion levels)
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100
      });

      // Create a map of subscription data for quick lookup
      const subscriptionMap = new Map();
      subscriptions.data.forEach(sub => {
        return subscriptionMap.set(sub.id, {
          planName: sub.metadata.planName || 'Premium Plan', // Default name since we can't expand product
          billingInterval: sub.items.data[0]?.price.recurring?.interval || 'monthly',
          status: sub.status,
          items: sub.items.data[0]
        });
      });

      // Transform Stripe invoice data to our payment format
      const paymentHistory = invoices.data
        .filter(invoice => invoice.status === 'paid' || invoice.status === 'open')
        .map(invoice => {
          // Get subscription ID from invoice lines if available
          const subscriptionId = invoice.parent?.subscription_details?.subscription;
          const subscriptionData = subscriptionId? subscriptionMap.get(subscriptionId) : null;
          const planName = subscriptionData?.planName || 'Premium Plan';
          const current_period_end = subscriptionData?.items?.current_period_end;
          const current_period_start = subscriptionData?.items?.current_period_start;

        
          return {
            id: invoice.id,
            date: new Date(invoice.created * 1000).toISOString(),
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            plan: planName,
            planId: '',
            status: invoice.status === 'paid' ? 'Paid' : 
                    invoice.status === 'open' ? 'Pending' : 
                    invoice.status === 'draft' ? 'Draft' : 'Unknown',
            billingInterval: subscriptionData?.billingInterval || 'monthly',
            paymentProvider: 'stripe',
            subscriptionId: subscriptionId || '',
            description: `${planName || 'Premium Plan'} - ${subscriptionData?.billingInterval || 'monthly'} billing`,
            invoiceUrl: invoice.hosted_invoice_url || null,
            invoicePdf: invoice.invoice_pdf || null,
            invoiceNumber: invoice.number || null,
            period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
            period_start: current_period_start ? new Date(current_period_start * 1000).toISOString() : null,
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json(paymentHistory);
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to fetch payment data from Stripe' }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment data' }, 
      { status: 500 }
    );
  }
}
