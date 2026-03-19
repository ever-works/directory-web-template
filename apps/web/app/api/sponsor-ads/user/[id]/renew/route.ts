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
 */
function validateRedirectUrl(url: string | undefined, allowedOrigin: string = appUrl): string | null {
	if (!url) {
		return null;
	}

	try {
		const urlObj = new URL(url, allowedOrigin);
		const allowedUrlObj = new URL(allowedOrigin);

		if (
			urlObj.protocol === allowedUrlObj.protocol &&
			urlObj.hostname === allowedUrlObj.hostname &&
			urlObj.port === allowedUrlObj.port
		) {
			return urlObj.toString();
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * @swagger
 * /api/sponsor-ads/user/{id}/renew:
 *   post:
 *     tags: ["Sponsor Ads - User"]
 *     summary: "Renew a sponsor ad"
 *     description: "Creates a checkout session to renew an active or expired sponsor ad. The sponsor ad must be owned by the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Sponsor ad ID to renew"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               successUrl:
 *                 type: string
 *                 description: "URL to redirect after successful payment"
 *               cancelUrl:
 *                 type: string
 *                 description: "URL to redirect after cancelled payment"
 *     responses:
 *       200:
 *         description: "Checkout session created successfully for renewal"
 *       400:
 *         description: "Bad request - Sponsor ad cannot be renewed or missing price configuration"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - User does not own this sponsor ad"
 *       404:
 *         description: "Sponsor ad not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		// Parse optional body for redirect URLs
		let successUrl: string | undefined;
		let cancelUrl: string | undefined;

		try {
			const body = await request.json();
			successUrl = body.successUrl;
			cancelUrl = body.cancelUrl;
		} catch {
			// Body is optional, continue without it
		}

		// Get the sponsor ad
		const sponsorAd = await sponsorAdService.getSponsorAdById(id);

		if (!sponsorAd) {
			return NextResponse.json({ success: false, error: 'Sponsor ad not found' }, { status: 404 });
		}

		// Verify ownership
		if (sponsorAd.userId !== session.user.id) {
			return NextResponse.json(
				{ success: false, error: 'You do not have permission to renew this sponsor ad' },
				{ status: 403 }
			);
		}

		// Check if sponsor ad can be renewed (active or expired)
		const renewableStatuses = [SponsorAdStatus.ACTIVE, SponsorAdStatus.EXPIRED];
		if (!renewableStatuses.includes(sponsorAd.status as typeof SponsorAdStatus.ACTIVE | typeof SponsorAdStatus.EXPIRED)) {
			return NextResponse.json(
				{
					success: false,
					error: `Cannot renew sponsor ad with status: ${sponsorAd.status}. Only active or expired ads can be renewed.`
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

		// Build success/cancel URLs with validation
		const validatedSuccessUrl = validateRedirectUrl(successUrl);
		const validatedCancelUrl = validateRedirectUrl(cancelUrl);

		if (successUrl && !validatedSuccessUrl) {
			console.warn('Invalid successUrl provided, using default:', {
				providedUrl: successUrl,
				userId: session.user.id,
				sponsorAdId: id
			});
		}
		if (cancelUrl && !validatedCancelUrl) {
			console.warn('Invalid cancelUrl provided, using default:', {
				providedUrl: cancelUrl,
				userId: session.user.id,
				sponsorAdId: id
			});
		}

		const finalSuccessUrl = validatedSuccessUrl || `${appUrl}/sponsor/success?sponsorAdId=${id}&renewal=true`;
		const finalCancelUrl = validatedCancelUrl || `${appUrl}/client/sponsorships?cancelled=true`;

		// Create checkout session based on provider
		let checkoutResult: { id: string; url: string | null };

		switch (ACTIVE_PAYMENT_PROVIDER) {
			case PaymentProvider.STRIPE:
				checkoutResult = await createStripeRenewalCheckout(
					session.user,
					sponsorAd,
					priceId,
					finalSuccessUrl,
					finalCancelUrl
				);
				break;

			case PaymentProvider.LEMONSQUEEZY:
				checkoutResult = await createLemonSqueezyRenewalCheckout(
					session.user,
					sponsorAd,
					priceId,
					finalSuccessUrl,
					finalCancelUrl
				);
				break;

			case PaymentProvider.POLAR:
				checkoutResult = await createPolarRenewalCheckout(
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
				sponsorAdId: id
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
			message: 'Renewal checkout session created successfully'
		});
	} catch (error) {
		console.error('Error creating sponsor ad renewal checkout:', error);

		return NextResponse.json({ success: false, error: 'Failed to create renewal checkout session' }, { status: 500 });
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
 * Create Stripe checkout session for renewal
 */
async function createStripeRenewalCheckout(
	user: { id?: string; email?: string | null; name?: string | null },
	sponsorAd: { id: string; itemSlug: string; interval: string; amount: number },
	priceId: string,
	successUrl: string,
	cancelUrl: string
): Promise<{ id: string; url: string | null }> {
	const stripeProvider = getOrCreateStripeProvider();
	const stripe = stripeProvider.getStripeInstance();

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
			type: 'sponsor_ad_renewal',
			isRenewal: 'true'
		},
		subscription_data: {
			metadata: {
				userId: user.id || '',
				sponsorAdId: sponsorAd.id,
				itemSlug: sponsorAd.itemSlug,
				type: 'sponsor_ad_renewal',
				isRenewal: 'true'
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
 * Create LemonSqueezy checkout session for renewal
 */
async function createLemonSqueezyRenewalCheckout(
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
			type: 'sponsor_ad_renewal',
			isRenewal: 'true',
			successUrl: successUrl,
			cancelUrl: cancelUrl,
			name: sponsorAd.itemSlug,
			description: `Sponsor ad renewal for ${sponsorAd.itemSlug}`
		}
	});

	return {
		id: result.id || '',
		url: result.checkoutData?.url || null
	};
}

/**
 * Create Polar checkout session for renewal
 */
async function createPolarRenewalCheckout(
	user: { id?: string; email?: string | null; name?: string | null },
	sponsorAd: { id: string; itemSlug: string; interval: string; amount: number },
	priceId: string,
	successUrl: string,
	cancelUrl: string
): Promise<{ id: string; url: string | null }> {
	const polarProvider = getOrCreatePolarProvider();

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
			type: 'sponsor_ad_renewal',
			isRenewal: 'true',
			successUrl: successUrl,
			cancelUrl: cancelUrl
		}
	});

	return {
		id: result.id || '',
		url: result.checkoutData?.url || null
	};
}
