/**
 * Public (browser-safe) payment configuration — spec 044.
 *
 * Platform-deployed k8s Works are built once by `.github/workflows/k8s-build.yml`
 * with no per-Work environment, so `NEXT_PUBLIC_*` values are never inlined into
 * the client bundle. At runtime the server process does receive them (from the
 * `${slug}-runtime-env` Secret, spec 040), so the browser asks the server via
 * `GET /api/payment/public-config` and falls back to whatever the bundle inlined.
 *
 * This module is shared by that route (server, runtime env) and by the client
 * hook `hooks/use-public-payment-config.ts` (browser, build-time env). It must
 * stay free of server-only imports and MUST NEVER read secret values
 * (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, …): the result is served to
 * anonymous browsers.
 */

export type PublicPaymentProvider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate';

/** Canonical provider order — also the order `configuredProviders` is reported in. */
export const PUBLIC_PAYMENT_PROVIDERS: readonly PublicPaymentProvider[] = [
	'stripe',
	'lemonsqueezy',
	'polar',
	'solidgate'
];

export interface PublicPaymentConfig {
	/** Stripe publishable key (`pk_…`), or `null` when Stripe is not configured. */
	stripePublishableKey: string | null;
	/** `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true'` — plans/prices come from the Stripe API. */
	dynamicPricing: boolean;
	/** `NEXT_PUBLIC_DEMO === 'true'`. */
	demo: boolean;
	/** Checkout providers whose public identifiers are present. */
	configuredProviders: PublicPaymentProvider[];
}

export const EMPTY_PUBLIC_PAYMENT_CONFIG: Readonly<PublicPaymentConfig> = {
	stripePublishableKey: null,
	dynamicPricing: false,
	demo: false,
	configuredProviders: []
};

function nonEmpty(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function isPublicPaymentProvider(value: unknown): value is PublicPaymentProvider {
	return typeof value === 'string' && (PUBLIC_PAYMENT_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Stripe publishable key from the environment.
 *
 * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the documented name; the server-only
 * `STRIPE_PUBLISHABLE_KEY` alias is accepted too (same precedence as
 * `lib/config/schemas/payment.schema.ts`). In the browser the alias is always
 * `undefined`, so only the inlined public name can match there.
 */
export function getStripePublishableKeyFromEnv(): string | null {
	return nonEmpty(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ?? nonEmpty(process.env.STRIPE_PUBLISHABLE_KEY);
}

/**
 * Which checkout providers have their public identifiers set.
 *
 * Mirrors the detection `LayoutThemeContext.getConfiguredProviders()` performed
 * before spec 044: Stripe = publishable key, LemonSqueezy = any
 * `NEXT_PUBLIC_LEMONSQUEEZY_*_VARIANT_ID`, Polar = any
 * `NEXT_PUBLIC_POLAR_*_PLAN_ID`. Solidgate had (and has) no public-key
 * detection, so it is never reported here.
 */
export function getConfiguredProvidersFromEnv(): PublicPaymentProvider[] {
	const providers: PublicPaymentProvider[] = [];

	if (getStripePublishableKeyFromEnv()) {
		providers.push('stripe');
	}

	if (
		process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID ||
		process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID ||
		process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID
	) {
		providers.push('lemonsqueezy');
	}

	if (
		process.env.NEXT_PUBLIC_POLAR_FREE_PLAN_ID ||
		process.env.NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID ||
		process.env.NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID
	) {
		providers.push('polar');
	}

	return providers;
}

/**
 * Read the full public payment configuration from `process.env`.
 *
 * On the server this is the runtime environment; in the browser it is whatever
 * Next.js inlined at build time (possibly nothing — see module doc).
 */
export function readPublicPaymentConfigFromEnv(): PublicPaymentConfig {
	return {
		stripePublishableKey: getStripePublishableKeyFromEnv(),
		dynamicPricing: process.env.NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true',
		demo: process.env.NEXT_PUBLIC_DEMO === 'true',
		configuredProviders: getConfiguredProvidersFromEnv()
	};
}

/**
 * Layer a (possibly partial / untrusted-shape) server-provided config over a
 * fallback — normally the build-time env config — so nothing the bundle already
 * knew is lost when the route is unavailable or returns a partial body.
 *
 * - Scalars: the primary value wins when it is present (non-empty string / boolean).
 * - `configuredProviders`: union, reported in canonical order; unknown values dropped.
 */
export function mergePublicPaymentConfig(
	primary: Partial<PublicPaymentConfig> | null | undefined,
	fallback: Readonly<PublicPaymentConfig>
): PublicPaymentConfig {
	if (!primary) {
		return { ...fallback, configuredProviders: [...fallback.configuredProviders] };
	}

	const providers = new Set<PublicPaymentProvider>(fallback.configuredProviders);
	for (const provider of primary.configuredProviders ?? []) {
		if (isPublicPaymentProvider(provider)) {
			providers.add(provider);
		}
	}

	const primaryKey = typeof primary.stripePublishableKey === 'string' ? primary.stripePublishableKey.trim() : '';

	return {
		stripePublishableKey: primaryKey || fallback.stripePublishableKey,
		dynamicPricing: typeof primary.dynamicPricing === 'boolean' ? primary.dynamicPricing : fallback.dynamicPricing,
		demo: typeof primary.demo === 'boolean' ? primary.demo : fallback.demo,
		configuredProviders: PUBLIC_PAYMENT_PROVIDERS.filter((provider) => providers.has(provider))
	};
}
