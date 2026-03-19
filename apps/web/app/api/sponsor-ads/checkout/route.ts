import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { SponsorAdStatus, SponsorAdInterval } from '@/lib/db/schema';
import { PaymentProvider } from '@/lib/constants';
import {
	getOrCreateStripeProvider,
	getOrCreateLemonsqueezyProvider,
	getOrCreatePolarProvider
} from '@/lib/payment/config/payment-provider-manager';
import type { CheckoutSessionParams } from '@/lib/payment/types/payment-types';

// Environment variables for sponsor ad price IDs
const STRIPE_SPONSOR_WEEKLY_PRICE_ID = process.env.STRIPE_SPONSOR_WEEKLY_PRICE_ID;
const STRIPE_SPONSOR_MONTHLY_PRICE_ID = process.env.STRIPE_SPONSOR_MONTHLY_PRICE_ID;
const LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID = process.env.LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID;
const LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID = process.env.LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID;
const POLAR_SPONSOR_WEEKLY_PRICE_ID = process.env.POLAR_SPONSOR_WEEKLY_PRICE_ID;
const POLAR_SPONSOR_MONTHLY_PRICE_ID = process.env.POLAR_SPONSOR_MONTHLY_PRICE_ID;

// Determine which payment provider to use
const ACTIVE_PAYMENT_PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || PaymentProvider.STRIPE;

const appUrl =
	process.env.NEXT_PUBLIC_APP_URL ??
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

/**
 * Validates that a URL belongs to the application domain to prevent open redirect vulnerabilities.
 * @param url - The URL to validate
 * @param allowedOrigin - The allowed origin (defaults to appUrl)
 * @returns The validated URL if it belongs to the allowed origin, null otherwise
 */
function validateRedirectUrl(url: string | undefined, allowedOrigin: string = appUrl): string | null {
	if (!url) {
		return null;
	}

	try {
		const urlObj = new URL(url, allowedOrigin);
		const allowedUrlObj = new URL(allowedOrigin);

		// Check if the URL belongs to the same origin (protocol, hostname, port)
		if (
			urlObj.protocol === allowedUrlObj.protocol &&
			urlObj.hostname === allowedUrlObj.hostname &&
			urlObj.port === allowedUrlObj.port
		) {
			return urlObj.toString();
		}

		// Reject URLs from different origins
		return null;
	} catch {
		// Invalid URL format - reject
		return null;
	}
}

/**
 * @swagger
 * /api/sponsor-ads/checkout:
 *   post:
 *     tags: ["Sponsor Ads"]
 *     summary: "Create sponsor ad checkout session"
 *     description: "Creates a checkout session for an approved sponsor ad. The sponsor ad must be in 'approved' status."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sponsorAdId
 *             properties:
 *               sponsorAdId:
 *                 type: string
 *                 description: "ID of the approved sponsor ad"
 *               successUrl:
 *                 type: string
 *                 description: "URL to redirect after successful payment"
 *               cancelUrl:
 *                 type: string
 *                 description: "URL to redirect after cancelled payment"
 *     responses:
 *       200:
 *         description: "Checkout session created successfully"
 *       400:
 *         description: "Bad request - Sponsor ad not approved or missing price configuration"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - User does not own this sponsor ad"
 *       404:
 *         description: "Sponsor ad not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { sponsorAdId, successUrl, cancelUrl } = body;

		if (!sponsorAdId) {
			return NextResponse.json({ success: false, error: 'Sponsor ad ID is required' }, { status: 400 });
		}

		// Get the sponsor ad
		const sponsorAd = await sponsorAdService.getSponsorAdById(sponsorAdId);

		if (!sponsorAd) {
			return NextResponse.json({ success: false, error: 'Sponsor ad not found' }, { status: 404 });
		}

		// Verify ownership
		if (sponsorAd.userId !== session.user.id) {
			return NextResponse.json(
				{ success: false, error: 'You do not have permission to pay for this sponsor ad' },
				{ status: 403 }
			);
		}

		// Check if sponsor ad is awaiting payment
		if (sponsorAd.status !== SponsorAdStatus.PENDING_PAYMENT) {
			return NextResponse.json(
				{
					success: false,
					error: `Sponsor ad is not awaiting payment. Current status: ${sponsorAd.status}`
				},
				{ status: 400 }
			);
		}

		// Get price ID based on interval and provider
		const priceId = getPriceId(sponsorAd.interval, ACTIVE_PAYMENT_PROVIDER);

		if (!priceId) {
			console.error(
				`Price not configured for ${sponsorAd.interval} interval with ${ACTIVE_PAYMENT_PROVIDER} provider`
			);
			return NextResponse.json(
				{
					success: false,
					error: 'Payment configuration is incomplete. Please contact support.'
				},
				{ status: 400 }
			);
		}

		// Build success/cancel URLs with validation to prevent open redirect vulnerabilities
		const validatedSuccessUrl = validateRedirectUrl(successUrl);
		const validatedCancelUrl = validateRedirectUrl(cancelUrl);

		// Log warning if invalid URLs were provided (potential security issue)
		if (successUrl && !validatedSuccessUrl) {
			console.warn('Invalid successUrl provided, using default:', {
				providedUrl: successUrl,
				userId: session.user.id,
				sponsorAdId
			});
		}
		if (cancelUrl && !validatedCancelUrl) {
			console.warn('Invalid cancelUrl provided, using default:', {
				providedUrl: cancelUrl,
				userId: session.user.id,
				sponsorAdId
			});
		}

		const finalSuccessUrl = validatedSuccessUrl || `${appUrl}/sponsor/success?sponsorAdId=${sponsorAdId}`;
		const finalCancelUrl = validatedCancelUrl || `${appUrl}/sponsor?cancelled=true`;

		// Create checkout session based on provider
		let checkoutResult: { id: string; url: string | null };

		switch (ACTIVE_PAYMENT_PROVIDER) {
			case PaymentProvider.STRIPE:
				checkoutResult = await createStripeCheckout(
					session.user,
					sponsorAd,
					priceId,
					finalSuccessUrl,
					finalCancelUrl
				);
				break;

			case PaymentProvider.LEMONSQUEEZY:
				checkoutResult = await createLemonSqueezyCheckout(
					session.user,
					sponsorAd,
					priceId,
					finalSuccessUrl,
					finalCancelUrl
				);
				break;

			case PaymentProvider.POLAR:
				checkoutResult = await createPolarCheckout(
					session.user,
					sponsorAd,
					priceId,
					finalSuccessUrl,
					finalCancelUrl
				);
				break;

			default:
				console.error(`Unsupported payment provider: ${ACTIVE_PAYMENT_PROVIDER}`);
				return NextResponse.json(
					{ success: false, error: 'Payment configuration is incomplete. Please contact support.' },
					{ status: 400 }
				);
		}

		// Validate that checkout URL was returned
		if (!checkoutResult.url) {
			console.error('Payment provider did not return checkout URL', {
				provider: ACTIVE_PAYMENT_PROVIDER,
				checkoutId: checkoutResult.id,
				sponsorAdId
			});
			return NextResponse.json(
				{ success: false, error: 'Failed to create checkout URL. Please try again.' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				checkoutId: checkoutResult.id,
				checkoutUrl: checkoutResult.url,
				provider: ACTIVE_PAYMENT_PROVIDER
			},
			message: 'Checkout session created successfully'
		});
	} catch (error) {
		console.error('Error creating sponsor ad checkout:', error);

		// Use generic message for 500 errors to avoid exposing sensitive details
		return NextResponse.json({ success: false, error: 'Failed to create checkout session' }, { status: 500 });
	}
}

/**
 * Get price ID based on interval and provider
 */
function getPriceId(interval: string, provider: string): string | null {
	if (provider === PaymentProvider.STRIPE) {
		if (interval === SponsorAdInterval.WEEKLY) {
			return STRIPE_SPONSOR_WEEKLY_PRICE_ID || null;
		}
		if (interval === SponsorAdInterval.MONTHLY) {
			return STRIPE_SPONSOR_MONTHLY_PRICE_ID || null;
		}
	}

	if (provider === PaymentProvider.LEMONSQUEEZY) {
		if (interval === SponsorAdInterval.WEEKLY) {
			const variantId = LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID;
			if (!variantId || isNaN(Number(variantId))) return null;
			return variantId;
		}
		if (interval === SponsorAdInterval.MONTHLY) {
			const variantId = LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID;
			if (!variantId || isNaN(Number(variantId))) return null;
			return variantId;
		}
	}

	if (provider === PaymentProvider.POLAR) {
		if (interval === SponsorAdInterval.WEEKLY) {
			return POLAR_SPONSOR_WEEKLY_PRICE_ID || null;
		}
		if (interval === SponsorAdInterval.MONTHLY) {
			return POLAR_SPONSOR_MONTHLY_PRICE_ID || null;
		}
	}

	return null;
}

/**
 * Create Stripe checkout session
 */
async function createStripeCheckout(
	user: { id?: string; email?: string | null; name?: string | null },
	sponsorAd: { id: string; itemSlug: string; interval: string; amount: number },
	priceId: string,
	successUrl: string,
	cancelUrl: string
): Promise<{ id: string; url: string | null }> {
	const stripeProvider = getOrCreateStripeProvider();
	const stripe = stripeProvider.getStripeInstance();

	// Get or create customer
	const customerId = await stripeProvider.getCustomerId(user as Parameters<typeof stripeProvider.getCustomerId>[0]);

	if (!customerId) {
		throw new Error('Failed to create Stripe customer');
	}

	const checkoutParams: CheckoutSessionParams = {
		customer: customerId,
		mode: 'subscription',
		line_items: [
			{
				price: priceId,
				quantity: 1
			}
		],
		success_url: successUrl,
		cancel_url: cancelUrl,
		billing_address_collection: 'auto',
		metadata: {
			sponsorAdId: sponsorAd.id,
			itemSlug: sponsorAd.itemSlug,
			type: 'sponsor_ad'
		},
		subscription_data: {
			metadata: {
				userId: user.id || '',
				sponsorAdId: sponsorAd.id,
				itemSlug: sponsorAd.itemSlug,
				type: 'sponsor_ad'
			}
		}
	};

	const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

	return {
		id: checkoutSession.id,
		url: checkoutSession.url
	};
}

/**
 * Create LemonSqueezy checkout session
 */
async function createLemonSqueezyCheckout(
	user: { id?: string; email?: string | null; name?: string | null },
	sponsorAd: { id: string; itemSlug: string; interval: string; amount: number },
	variantId: string,
	successUrl: string,
	cancelUrl: string
): Promise<{ id: string; url: string | null }> {
	const lemonProvider = getOrCreateLemonsqueezyProvider();

	const result = await lemonProvider.createSubscription({
		variantId: Number(variantId),
		email: user.email || undefined,
		metadata: {
			userId: user.id || '',
			sponsorAdId: sponsorAd.id,
			itemSlug: sponsorAd.itemSlug,
			type: 'sponsor_ad',
			successUrl: successUrl,
			cancelUrl: cancelUrl,
			name: sponsorAd.itemSlug,
			description: `Sponsor ad for ${sponsorAd.itemSlug}`
		}
	});

	return {
		id: result.id || '',
		url: result.checkoutData?.url || null
	};
}

/**
 * Create Polar checkout session
 */
async function createPolarCheckout(
	user: { id?: string; email?: string | null; name?: string | null },
	sponsorAd: { id: string; itemSlug: string; interval: string; amount: number },
	priceId: string,
	successUrl: string,
	cancelUrl: string
): Promise<{ id: string; url: string | null }> {
	const polarProvider = getOrCreatePolarProvider();

	// Get or create customer ID
	const customerId = await polarProvider.getCustomerId(user as Parameters<typeof polarProvider.getCustomerId>[0]);

	if (!customerId) {
		throw new Error('Failed to create Polar customer');
	}

	const result = await polarProvider.createSubscription({
		customerId: customerId,
		priceId: priceId,
		metadata: {
			userId: user.id || '',
			sponsorAdId: sponsorAd.id,
			itemSlug: sponsorAd.itemSlug,
			type: 'sponsor_ad',
			successUrl: successUrl,
			cancelUrl: cancelUrl
		}
	});

	return {
		id: result.id || '',
		url: result.checkoutData?.url || null
	};
}
