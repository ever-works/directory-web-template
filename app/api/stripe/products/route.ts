/**
 * GET /api/stripe/products
 *
 * Fetches products and prices from Stripe for dynamic pricing.
 * Caching is handled internally by stripe-products.service.ts (5-min TTL).
 *
 * Response:
 * - products: Array of products with their prices
 * - sponsorAds: Sponsor ad pricing (weekly/monthly)
 * - stripeConfig: Multi-currency price IDs in STRIPE_CONFIG format
 * - cached: Whether the response came from cache
 */

import { NextResponse } from 'next/server';
import {
	fetchStripeProducts,
	isStripeDynamicPricingEnabled,
	buildDynamicStripeConfig
} from '@/lib/services/stripe-products.service';

export async function GET() {
	try {
		// Check if dynamic pricing is enabled
		if (!isStripeDynamicPricingEnabled()) {
			return NextResponse.json(
				{
					error: 'Dynamic pricing is not enabled',
					message: 'Set NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true to enable'
				},
				{ status: 400 }
			);
		}

		// Check if Stripe is configured
		if (!process.env.STRIPE_SECRET_KEY) {
			return NextResponse.json(
				{
					error: 'Stripe not configured',
					message: 'STRIPE_SECRET_KEY is required'
				},
				{ status: 500 }
			);
		}

		const productsData = await fetchStripeProducts();

		// Build STRIPE_CONFIG format with multi-currency price IDs
		const stripeConfig = buildDynamicStripeConfig(productsData.products);

		return NextResponse.json({
			...productsData,
			stripeConfig
		});
	} catch (error: any) {
		console.error('[API] /api/stripe/products error:', error);

		return NextResponse.json(
			{
				error: 'Failed to fetch products',
				message: error.message || 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
