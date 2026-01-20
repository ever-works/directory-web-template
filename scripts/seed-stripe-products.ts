/**
 * Stripe Product Seeder
 *
 * Creates products and prices in Stripe with the correct metadata
 * for the dynamic pricing system.
 *
 * Usage: npx tsx scripts/seed-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
	console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
	process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-07-30.basil' as Stripe.LatestApiVersion
});

interface ProductConfig {
	name: string;
	description: string;
	metadata: {
		plan: string;
		type: string;
		features?: string;
		annualDiscount?: string;
	};
	prices: {
		monthly?: number; // In cents
		yearly?: number; // In cents
		oneTime?: number; // For sponsor ads
	};
}

const products: ProductConfig[] = [
	{
		name: 'Free',
		description: 'Get started with basic features',
		metadata: {
			plan: 'free',
			type: 'subscription',
			features: JSON.stringify(['Basic listing', 'Standard visibility', 'Community support'])
		},
		prices: {
			monthly: 0,
			yearly: 0
		}
	},
	{
		name: 'Standard',
		description: 'Enhanced features for growing businesses',
		metadata: {
			plan: 'standard',
			type: 'subscription',
			features: JSON.stringify([
				'Featured listing',
				'Priority placement',
				'Analytics dashboard',
				'Email support'
			]),
			annualDiscount: '20'
		},
		prices: {
			monthly: 1000, // $10/month
			yearly: 9600 // $96/year (20% off)
		}
	},
	{
		name: 'Premium',
		description: 'Full access for professional use',
		metadata: {
			plan: 'premium',
			type: 'subscription',
			features: JSON.stringify([
				'Top placement',
				'Custom branding',
				'API access',
				'Priority support',
				'Advanced analytics'
			]),
			annualDiscount: '25'
		},
		prices: {
			monthly: 2000, // $20/month
			yearly: 18000 // $180/year (25% off)
		}
	},
	{
		name: 'Sponsored Ad - Weekly',
		description: 'Premium visibility for one week',
		metadata: {
			plan: 'sponsor_weekly',
			type: 'sponsor_ad'
		},
		prices: {
			oneTime: 10000 // $100
		}
	},
	{
		name: 'Sponsored Ad - Monthly',
		description: 'Premium visibility for one month',
		metadata: {
			plan: 'sponsor_monthly',
			type: 'sponsor_ad'
		},
		prices: {
			oneTime: 30000 // $300
		}
	}
];

async function seedProducts() {
	console.log('🚀 Starting Stripe product seeding...\n');

	for (const config of products) {
		try {
			console.log(`Creating product: ${config.name}`);

			// Create product
			const product = await stripe.products.create({
				name: config.name,
				description: config.description,
				metadata: config.metadata
			});

			console.log(`  ✓ Product created: ${product.id}`);

			// Create prices
			if (config.prices.monthly !== undefined && config.prices.monthly > 0) {
				const monthlyPrice = await stripe.prices.create({
					product: product.id,
					unit_amount: config.prices.monthly,
					currency: 'usd',
					recurring: { interval: 'month' }
				});
				console.log(`  ✓ Monthly price: ${monthlyPrice.id} ($${config.prices.monthly / 100}/month)`);
			}

			if (config.prices.yearly !== undefined && config.prices.yearly > 0) {
				const yearlyPrice = await stripe.prices.create({
					product: product.id,
					unit_amount: config.prices.yearly,
					currency: 'usd',
					recurring: { interval: 'year' }
				});
				console.log(`  ✓ Yearly price: ${yearlyPrice.id} ($${config.prices.yearly / 100}/year)`);
			}

			if (config.prices.oneTime !== undefined) {
				const oneTimePrice = await stripe.prices.create({
					product: product.id,
					unit_amount: config.prices.oneTime,
					currency: 'usd'
				});
				console.log(`  ✓ One-time price: ${oneTimePrice.id} ($${config.prices.oneTime / 100})`);
			}

			// For free plan, create a $0 price
			if (config.metadata.plan === 'free') {
				const freePrice = await stripe.prices.create({
					product: product.id,
					unit_amount: 0,
					currency: 'usd',
					recurring: { interval: 'month' }
				});
				console.log(`  ✓ Free price: ${freePrice.id}`);
			}

			console.log('');
		} catch (error: any) {
			console.error(`  ✗ Error creating ${config.name}:`, error.message);
		}
	}

	console.log('✅ Seeding complete!\n');
	console.log('Now clear the cache by restarting your dev server or wait 5 minutes.');
}

// Run the seeder
seedProducts().catch(console.error);
