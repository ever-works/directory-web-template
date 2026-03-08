import { NextRequest, NextResponse } from 'next/server';
import { auth, getOrCreatePolarProvider } from '@/lib/auth';
import { coreConfig } from '@/lib/config/config-service';
import { extractReturnUrl, buildAbsoluteUrl } from './utils';

/**
 * @swagger
 * /api/polar/subscription/portal:
 *   post:
 *     tags: ["Polar - Subscriptions"]
 *     summary: "Create customer portal session"
 *     description: "Creates a Polar customer portal session for the authenticated user to manage their subscription, payment methods, and billing history. Automatically redirects back to the billing settings page after completion."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Customer portal session created successfully"
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
 *                       description: "Customer portal session ID"
 *                       example: "cs_1234567890abcdef"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: "Customer portal URL"
 *                       example: "https://polar.sh/customer/session/abc123def456"
 *                     customer:
 *                       type: string
 *                       description: "Polar customer ID"
 *                       example: "cus_1234567890abcdef"
 *                     return_url:
 *                       type: string
 *                       format: uri
 *                       description: "Return URL after portal session"
 *                       example: "https://example.com/settings/billing"
 *                   required: ["id", "url", "customer", "return_url"]
 *                 message:
 *                   type: string
 *                   example: "Customer portal session created"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "cs_1234567890abcdef"
 *                 url: "https://polar.sh/customer/session/abc123def456"
 *                 customer: "cus_1234567890abcdef"
 *                 return_url: "https://example.com/settings/billing"
 *               message: "Customer portal session created"
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
 *       404:
 *         description: "Not found - Polar customer ID not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Polar customer ID not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create customer portal session"
 *     x-portal-features:
 *       description: "Features available in the customer portal"
 *       features:
 *         - "View and download invoices"
 *         - "Update payment methods"
 *         - "Change subscription plan"
 *         - "Cancel subscription"
 *         - "Update billing address"
 *         - "View payment history"
 *         - "Manage subscription settings"
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get or create Polar provider (singleton)
		const polarProvider = getOrCreatePolarProvider();

		// Get or create Polar customer
		const polarCustomerId = await polarProvider.getCustomerId(session.user as any);
		if (!polarCustomerId) {
			return NextResponse.json(
				{
					error: 'Polar customer ID not found',
					message: 'Unable to find or create Polar customer'
				},
				{ status: 404 }
			);
		}

		// Extract return URL from request body (returns relative path)
		const returnUrlPath = await extractReturnUrl(request);

		// Create customer portal session
		// normalizeReturnUrl will construct the absolute URL from the relative path
		const portalSession = await polarProvider.createCustomerPortalSession(
			polarCustomerId,
			returnUrlPath
		);

		if (!portalSession.url) {
			return NextResponse.json(
				{
					error: 'Failed to create portal session',
					message: 'Portal session URL not available'
				},
				{ status: 500 }
			);
		}

		// Build absolute URL for API response (contract requires absolute URI)
		const returnUrlAbsolute = buildAbsoluteUrl(returnUrlPath);

		// Return response in the same format as Stripe for consistency
		return NextResponse.json({
			success: true,
			data: {
				id: portalSession.id,
				url: portalSession.url,
				customer: polarCustomerId,
				return_url: returnUrlAbsolute
			},
			message: 'Customer portal session created'
		});
	} catch (error) {
		console.error('Error creating Polar customer portal session:', error);

		// Extract detailed error information
		let errorMessage = 'Unknown error';
		let errorDetails: any = {};

		if (error instanceof Error) {
			errorMessage = error.message;
			errorDetails = {
				name: error.name,
				message: error.message,
				...(coreConfig.NODE_ENV === 'development' && {
					stack: error.stack
				})
			};
		} else if (typeof error === 'object' && error !== null) {
			errorMessage = String(error);
			errorDetails = error;
		}

		// Log full error for debugging
		if (coreConfig.NODE_ENV === 'development') {
			console.error('Full error object:', JSON.stringify(error, null, 2));
		}

		return NextResponse.json(
			{
				error: 'Failed to create customer portal session',
				message: coreConfig.NODE_ENV === 'development'
					? errorMessage
					: 'Failed to create customer portal session',
				...(coreConfig.NODE_ENV === 'development' && {
					details: errorDetails
				})
			},
			{ status: 500 }
		);
	}
}

