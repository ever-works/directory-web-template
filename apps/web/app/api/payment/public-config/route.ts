/**
 * @swagger
 * /api/payment/public-config:
 *   get:
 *     tags: ["Payment - Public Config"]
 *     summary: "Get the public (browser-safe) payment configuration"
 *     description: "Returns the public payment configuration derived from the server's runtime environment so the browser can obtain it at request time (spec 044). Platform-deployed k8s Works are built without per-Work env, so NEXT_PUBLIC_* values are not inlined into the client bundle; this route is how the client learns the Stripe publishable key, the dynamic-pricing / demo flags and which checkout providers are configured. Only publishable values are returned; server-side credentials are never exposed. Always dynamic, never cached."
 *     responses:
 *       200:
 *         description: "Public payment configuration"
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: "no-store, no-cache, must-revalidate, private, max-age=0"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stripePublishableKey:
 *                   type: string
 *                   nullable: true
 *                   description: "Stripe publishable key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, falling back to STRIPE_PUBLISHABLE_KEY), or null"
 *                   example: "pk_test_51Example"
 *                 dynamicPricing:
 *                   type: boolean
 *                   description: "NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true'"
 *                   example: false
 *                 demo:
 *                   type: boolean
 *                   description: "NEXT_PUBLIC_DEMO === 'true'"
 *                   example: false
 *                 configuredProviders:
 *                   type: array
 *                   description: "Checkout providers whose public identifiers are set, in canonical order"
 *                   items:
 *                     type: string
 *                     enum: ["stripe", "lemonsqueezy", "polar", "solidgate"]
 *                   example: ["stripe"]
 *               required: ["stripePublishableKey", "dynamicPricing", "demo", "configuredProviders"]
 *             example:
 *               stripePublishableKey: "pk_test_51Example"
 *               dynamicPricing: false
 *               demo: false
 *               configuredProviders: ["stripe"]
 */

import { NextResponse } from 'next/server';
import { readPublicPaymentConfigFromRuntimeEnv } from '@/lib/payment/public-config';

// Must read the *runtime* environment on every request — never prerender / cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0'
} as const;

export async function GET() {
	return NextResponse.json(readPublicPaymentConfigFromRuntimeEnv(), { headers: NO_STORE_HEADERS });
}
