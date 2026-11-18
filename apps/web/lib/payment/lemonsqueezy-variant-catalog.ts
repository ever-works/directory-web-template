import { LEMONSQUEEZY_CONFIG } from '@/lib/config/billing/lemonsqueezy.config';
import { getCachedConfig } from '@/lib/content';
import {
	buildLemonSqueezyVariantCatalog,
	collectLemonSqueezyVariantSources,
	type LemonSqueezyVariantCatalog
} from './lemonsqueezy-variant-plan';

/**
 * The live variant → plan catalog for the LemonSqueezy webhook (spec 060 R9), from the same
 * configuration the pricing page checks out with. The env names are written out (not looked up by
 * key) so Next.js inlines the `NEXT_PUBLIC_*` values the client bundle was built with.
 *
 * Throws when `works.yml` cannot be read, so the event is answered 503 and redelivered instead of
 * being acknowledged as an unknown variant.
 */
export async function loadLemonSqueezyVariantCatalog(): Promise<LemonSqueezyVariantCatalog> {
	const content = await getCachedConfig();

	return buildLemonSqueezyVariantCatalog(
		collectLemonSqueezyVariantSources({
			billing: LEMONSQUEEZY_CONFIG,
			defaults: {
				free: [process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID],
				standard: [
					process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID,
					process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID
				],
				premium: [
					process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID,
					process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID
				]
			},
			pricingPlans: content.pricing?.plans as Record<string, unknown> | undefined,
			sponsorAds: {
				weekly: process.env.LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID,
				monthly: process.env.LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID
			}
		})
	);
}
