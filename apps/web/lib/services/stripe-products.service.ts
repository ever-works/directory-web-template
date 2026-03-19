/**
 * Stripe Products Service
 *
 * Server-side service for fetching and caching Stripe products and prices.
 * When STRIPE_DYNAMIC_PRICING is enabled, products/prices are loaded from Stripe API
 * instead of using hardcoded environment variables.
 *
 * Products in Stripe must have metadata:
 * - metadata.plan: 'free' | 'standard' | 'premium' | 'sponsor_weekly' | 'sponsor_monthly'
 * - metadata.type: 'subscription' | 'sponsor_ad' (optional)
 */

import Stripe from 'stripe';
import { PricingConfig, PricingPlans } from '@/lib/content';
import { PaymentInterval } from '@/lib/constants';
import type { PlanConfig, CurrencyCode } from '@/lib/config/billing';

// ============================================
// TYPES
// ============================================

export type StripePlanType = 'free' | 'standard' | 'premium' | 'sponsor_weekly' | 'sponsor_monthly';

export interface StripePrice {
	id: string;
	unitAmount: number; // In cents
	currency: string;
	recurring: {
		interval: 'day' | 'week' | 'month' | 'year';
		intervalCount: number;
	} | null;
	active: boolean;
}

export interface StripeProduct {
	id: string;
	name: string;
	description: string | null;
	metadata: {
		plan?: StripePlanType;
		type?: 'subscription' | 'sponsor_ad';
		features?: string; // JSON array of features
		annualDiscount?: string; // Percentage discount for annual
	};
	prices: StripePrice[];
	active: boolean;
}

export interface StripeProductsResponse {
	products: StripeProduct[];
	sponsorAds: {
		weekly: StripePrice | null;
		monthly: StripePrice | null;
	};
	cached: boolean;
	cachedAt: string | null;
}

interface CacheEntry {
	data: StripeProductsResponse;
	timestamp: number;
}

let productsCache: CacheEntry | null = null;
let pendingFetch: Promise<StripeProductsResponse> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the products cache - called when config changes
 */
export function clearStripeProductsCache(): void {
	productsCache = null;
	console.log('[StripeProducts] Cache cleared');
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
	if (!productsCache) return false;
	return Date.now() - productsCache.timestamp < CACHE_TTL_MS;
}

function getStripeClient(): Stripe | null {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) {
		console.warn('[StripeProducts] STRIPE_SECRET_KEY not configured');
		return null;
	}

	return new Stripe(secretKey, {
		apiVersion: '2025-07-30.basil' as Stripe.LatestApiVersion
	});
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Fetch all products from Stripe with their prices
 * Results are cached for 5 minutes
 * Uses promise deduplication to prevent concurrent requests
 */
export async function fetchStripeProducts(): Promise<StripeProductsResponse> {
	// Return cached data if valid
	if (isCacheValid() && productsCache) {
		return {
			...productsCache.data,
			cached: true
		};
	}

	// Return pending promise if fetch is already in progress (prevents race condition)
	if (pendingFetch) {
		return pendingFetch;
	}

	// Start new fetch and store the promise
	pendingFetch = fetchFromStripeAPI();

	try {
		return await pendingFetch;
	} finally {
		pendingFetch = null;
	}
}

/**
 * Internal function to fetch from Stripe API
 */
async function fetchFromStripeAPI(): Promise<StripeProductsResponse> {
	const stripe = getStripeClient();
	if (!stripe) {
		return {
			products: [],
			sponsorAds: { weekly: null, monthly: null },
			cached: false,
			cachedAt: null
		};
	}

	try {
		// Fetch ALL active products using auto-pagination
		// This handles cases where there are more products than the default page size
		const allProducts = await stripe.products
			.list({
				active: true,
				limit: 100 // Max per request
			})
			.autoPagingToArray({ limit: 500 }); // Fetch up to 500 products

		// Fetch ALL active prices using auto-pagination
		// Important for multi-currency setups where each product can have many prices
		const allPrices = await stripe.prices
			.list({
				active: true,
				limit: 100 // Max per request
			})
			.autoPagingToArray({ limit: 1000 }); // Fetch up to 1000 prices

		// Group prices by product ID
		const pricesByProduct = new Map<string, StripePrice[]>();
		for (const price of allPrices) {
			const productId = typeof price.product === 'string' ? price.product : price.product?.id;
			if (!productId) continue;

			const existing = pricesByProduct.get(productId) || [];
			existing.push({
				id: price.id,
				unitAmount: price.unit_amount || 0,
				currency: price.currency,
				recurring: price.recurring
					? {
							interval: price.recurring.interval,
							intervalCount: price.recurring.interval_count
						}
					: null,
				active: price.active
			});
			pricesByProduct.set(productId, existing);
		}

		// Transform products
		const transformedProducts: StripeProduct[] = [];
		let sponsorWeekly: StripePrice | null = null;
		let sponsorMonthly: StripePrice | null = null;

		for (const product of allProducts) {
			const planType = product.metadata?.plan as StripePlanType | undefined;
			if (!planType) continue; // Skip products without plan metadata

			const productPrices = pricesByProduct.get(product.id) || [];

			// Handle sponsor ads separately
			if (planType === 'sponsor_weekly' || planType === 'sponsor_monthly') {
				const price = productPrices[0]; // Take first price
				if (price) {
					if (planType === 'sponsor_weekly') {
						sponsorWeekly = price;
					} else {
						sponsorMonthly = price;
					}
				}
				continue;
			}

			transformedProducts.push({
				id: product.id,
				name: product.name,
				description: product.description,
				metadata: product.metadata as StripeProduct['metadata'],
				prices: productPrices,
				active: product.active
			});
		}

		const result: StripeProductsResponse = {
			products: transformedProducts,
			sponsorAds: {
				weekly: sponsorWeekly,
				monthly: sponsorMonthly
			},
			cached: false,
			cachedAt: new Date().toISOString()
		};

		// Update cache
		productsCache = {
			data: result,
			timestamp: Date.now()
		};

		console.log(
			`[StripeProducts] Fetched ${transformedProducts.length} products, sponsor ads: weekly=${!!sponsorWeekly}, monthly=${!!sponsorMonthly}`
		);

		return result;
	} catch (error) {
		console.error('[StripeProducts] Error fetching products:', error);
		return {
			products: [],
			sponsorAds: { weekly: null, monthly: null },
			cached: false,
			cachedAt: null
		};
	}
}

/**
 * Get sponsor ad pricing from Stripe
 */
export async function getStripeSponsorAdPricing(): Promise<{
	weekly: StripePrice;
	monthly: StripePrice;
} | null> {
	const { sponsorAds } = await fetchStripeProducts();

	if (!sponsorAds.weekly || !sponsorAds.monthly) {
		return null;
	}

	return {
		weekly: sponsorAds.weekly,
		monthly: sponsorAds.monthly
	};
}

/**
 * Map Stripe products to PricingPlans format
 * Used by pricing section when dynamic pricing is enabled
 */
export function mapStripeProductsToPricingPlans(
	products: StripeProduct[],
	currency: string = 'usd'
): Partial<PricingPlans> {
	const plans: Partial<PricingPlans> = {};
	const normalizedCurrency = currency.toLowerCase();

	for (const product of products) {
		const planType = product.metadata?.plan;
		if (!planType || !['free', 'standard', 'premium'].includes(planType)) continue;

		// Find monthly and yearly prices for the currency
		const prices = product.prices.filter((p) => p.currency.toLowerCase() === normalizedCurrency && p.active);

		const monthlyPrice = prices.find((p) => p.recurring?.interval === 'month');
		const yearlyPrice = prices.find((p) => p.recurring?.interval === 'year');

		// Skip paid plans without a valid monthly price in this currency
		// This allows the caller to fall back to static config instead of getting
		// a broken plan with price 0 and no stripePriceId
		if (planType !== 'free' && !monthlyPrice) {
			console.warn(
				`[StripeProducts] Skipping ${planType} plan: no ${normalizedCurrency.toUpperCase()} monthly price found`
			);
			continue;
		}

		// Parse features from metadata
		let features: string[] = [];
		if (product.metadata?.features) {
			try {
				const parsed: unknown = JSON.parse(product.metadata.features);
				features = Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')
					? parsed
					: [];
			} catch {
				features = [];
			}
		}

		// Calculate annual discount
		let annualDiscount = 0;
		if (product.metadata?.annualDiscount) {
			annualDiscount = parseInt(product.metadata.annualDiscount, 10) || 0;
		} else if (monthlyPrice && yearlyPrice) {
			// Calculate discount from actual prices
			const expectedYearly = monthlyPrice.unitAmount * 12;
			if (expectedYearly > yearlyPrice.unitAmount) {
				annualDiscount = Math.round(((expectedYearly - yearlyPrice.unitAmount) / expectedYearly) * 100);
			}
		}

		const config: PricingConfig = {
			id: planType,
			name: product.name,
			description: product.description || '',
			price: monthlyPrice ? monthlyPrice.unitAmount / 100 : 0,
			stripeProductId: product.id,
			stripePriceId: monthlyPrice?.id,
			annualPriceId: yearlyPrice?.id,
			features,
			popular: planType === 'standard',
			annualDiscount,
			isPremium: planType === 'premium',
			interval: PaymentInterval.MONTHLY,
			isActive: product.active
		};

		if (planType === 'free') {
			plans.FREE = config;
		} else if (planType === 'standard') {
			plans.STANDARD = config;
		} else if (planType === 'premium') {
			plans.PREMIUM = config;
		}
	}

	return plans;
}

/**
 * Check if Stripe dynamic pricing is enabled
 */
export function isStripeDynamicPricingEnabled(): boolean {
	return process.env.NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true';
}

// ============================================
// DYNAMIC STRIPE_CONFIG BUILDER
// ============================================

const CURRENCY_SYMBOLS: Record<string, string> = {
	usd: '$',
	eur: '€',
	gbp: '£',
	cad: 'CA$'
};

/**
 * Build a dynamic STRIPE_CONFIG from fetched Stripe products
 * This replaces the static env var-based configuration
 */
export function buildDynamicStripeConfig(
	products: StripeProduct[]
): Record<'premium' | 'standard' | 'free', PlanConfig> {
	const config: Record<'premium' | 'standard' | 'free', PlanConfig> = {
		premium: { productId: undefined },
		standard: { productId: undefined },
		free: { productId: undefined }
	};

	for (const product of products) {
		const planType = product.metadata?.plan;
		if (!planType || !['free', 'standard', 'premium'].includes(planType)) continue;

		// Group prices by currency
		const pricesByCurrency = new Map<string, { monthly?: string; yearly?: string }>();

		for (const price of product.prices) {
			if (!price.active) continue;
			const currency = price.currency.toLowerCase() as CurrencyCode;
			const existing = pricesByCurrency.get(currency) || {};

			if (price.recurring?.interval === 'month') {
				existing.monthly = price.id;
			} else if (price.recurring?.interval === 'year') {
				existing.yearly = price.id;
			}

			pricesByCurrency.set(currency, existing);
		}

		// Build PlanConfig
		const planConfig: PlanConfig = {
			productId: product.id
		};

		// Add each currency configuration
		for (const [currency, prices] of pricesByCurrency.entries()) {
			const currencyKey = currency as CurrencyCode;
			planConfig[currencyKey] = {
				amount: {
					monthly: prices.monthly,
					yearly: prices.yearly,
					setupFee: undefined // Not used in dynamic mode
				},
				currency: currency.toUpperCase(),
				symbol: CURRENCY_SYMBOLS[currency] || '$'
			};
		}

		// Assign to correct plan
		if (planType === 'premium') {
			config.premium = planConfig;
		} else if (planType === 'standard') {
			config.standard = planConfig;
		} else if (planType === 'free') {
			config.free = planConfig;
		}
	}

	return config;
}

/**
 * Get dynamic Stripe config - fetches from API and builds STRIPE_CONFIG format
 * Use this instead of static STRIPE_CONFIG when dynamic pricing is enabled
 */
export async function getDynamicStripeConfig(): Promise<Record<'premium' | 'standard' | 'free', PlanConfig> | null> {
	if (!isStripeDynamicPricingEnabled()) {
		return null;
	}

	const { products } = await fetchStripeProducts();
	if (!products.length) {
		return null;
	}

	return buildDynamicStripeConfig(products);
}
