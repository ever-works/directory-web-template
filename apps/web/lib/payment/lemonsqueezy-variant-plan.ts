import { PaymentPlan } from '@/lib/constants/payment';
import type { CurrencyCode, PlanConfig } from '@/lib/config/billing/types';

/**
 * Which plan (or sponsor-ad interval) a LemonSqueezy variant stands for (spec 060 R9).
 *
 * The plan a subscription grants must come from the variant that was paid for, read from server
 * configuration. `meta.custom_data` cannot decide it: the buyer controls it (a checkout link
 * accepts `checkout[custom][...]`, and the checkout route used to copy client metadata into it),
 * so a cheap variant could carry `planId: 'premium'`.
 *
 * The catalog is built from the same sources the pricing page picks `variantId` from
 * (`hooks/use-pricing-section.ts`): the per-currency monthly/yearly ids of `LEMONSQUEEZY_CONFIG`,
 * then each plan card's `lemonVariantId` (built-in defaults or `works.yml` `pricing.plans`), plus
 * the sponsor-ad variants the sponsor checkout uses. Kept free of app imports with side effects
 * so it can be unit-tested; `lemonsqueezy-variant-catalog.ts` feeds it the live configuration.
 */

export type LemonSqueezyVariantTarget = { kind: 'plan'; planId: string } | { kind: 'sponsor_ad'; interval: string };

export type LemonSqueezyVariantMatch = LemonSqueezyVariantTarget | { kind: 'unknown' };

type VariantIdInput = string | number | null | undefined;

export interface LemonSqueezyVariantSources {
	plans: ReadonlyArray<{ planId: string; variantIds: ReadonlyArray<VariantIdInput> }>;
	sponsorAds: ReadonlyArray<{ interval: string; variantIds: ReadonlyArray<VariantIdInput> }>;
}

export interface LemonSqueezyVariantCatalog {
	readonly targets: ReadonlyMap<string, LemonSqueezyVariantTarget>;
	/** Ids configured for two different targets. They grant nothing until the configuration is fixed. */
	readonly ambiguous: ReadonlySet<string>;
}

/** The plans the pricing page can check out (`validateAndMapPlanName`). */
const CHECKOUT_PLAN_IDS: ReadonlySet<string> = new Set(Object.values(PaymentPlan));
/** The currencies `LEMONSQUEEZY_CONFIG` carries variant ids for. */
const BILLING_CURRENCIES: readonly CurrencyCode[] = ['usd', 'eur', 'gbp', 'cad'];

/** A variant id as a trimmed string; events carry numbers, configuration carries strings. */
export function normalizeVariantId(value: unknown): string | undefined {
	if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : undefined;
	if (typeof value === 'string') return value.trim() || undefined;
	return undefined;
}

function sameTarget(a: LemonSqueezyVariantTarget, b: LemonSqueezyVariantTarget): boolean {
	if (a.kind === 'plan' && b.kind === 'plan') return a.planId === b.planId;
	if (a.kind === 'sponsor_ad' && b.kind === 'sponsor_ad') return a.interval === b.interval;
	return false;
}

export function buildLemonSqueezyVariantCatalog(sources: LemonSqueezyVariantSources): LemonSqueezyVariantCatalog {
	const targets = new Map<string, LemonSqueezyVariantTarget>();
	const ambiguous = new Set<string>();

	const add = (variantId: VariantIdInput, target: LemonSqueezyVariantTarget) => {
		const id = normalizeVariantId(variantId);
		if (!id || ambiguous.has(id)) return;
		const existing = targets.get(id);
		if (!existing) {
			targets.set(id, target);
		} else if (!sameTarget(existing, target)) {
			targets.delete(id);
			ambiguous.add(id);
		}
	};

	for (const plan of sources.plans) {
		for (const id of plan.variantIds) add(id, { kind: 'plan', planId: plan.planId });
	}
	for (const sponsorAd of sources.sponsorAds) {
		for (const id of sponsorAd.variantIds) add(id, { kind: 'sponsor_ad', interval: sponsorAd.interval });
	}

	return { targets, ambiguous };
}

/** What the paid variant grants; `unknown` for a missing, unconfigured or ambiguous id. */
export function matchLemonSqueezyVariant(
	catalog: LemonSqueezyVariantCatalog,
	variantId: unknown
): LemonSqueezyVariantMatch {
	const id = normalizeVariantId(variantId);
	return (id && catalog.targets.get(id)) || { kind: 'unknown' };
}

/**
 * True when the variant is configured for a plan (spec 060 R12). A subscription may only be moved
 * to such a variant: the webhook keeps the stored plan when the new variant is not a plan variant,
 * so a move to a sponsor-ad or unlisted variant would keep the paid plan at another price.
 */
export function isLemonSqueezyPlanVariant(catalog: LemonSqueezyVariantCatalog, variantId: unknown): boolean {
	return matchLemonSqueezyVariant(catalog, variantId).kind === 'plan';
}

export interface LemonSqueezyVariantConfig {
	/** `LEMONSQUEEZY_CONFIG` (`lib/config/billing/lemonsqueezy.config.ts`). */
	billing: Partial<Record<string, PlanConfig>>;
	/** The built-in plan cards' `lemonVariantId` env values, per plan id (`lib/types.ts`). */
	defaults: Partial<Record<string, ReadonlyArray<VariantIdInput>>>;
	/** `works.yml` `pricing.plans`, whose cards carry `id` and `lemonVariantId`. */
	pricingPlans?: Record<string, unknown> | null;
	/** `LEMONSQUEEZY_SPONSOR_{WEEKLY,MONTHLY}_VARIANT_ID`, keyed by sponsor-ad interval. */
	sponsorAds: Partial<Record<string, VariantIdInput>>;
}

/**
 * The variant ids per plan and per sponsor-ad interval. Setup-fee ids are left out: the pricing
 * page never checks them out. A `works.yml` plan whose id is not a plan the pricing page can
 * check out is ignored.
 */
export function collectLemonSqueezyVariantSources(config: LemonSqueezyVariantConfig): LemonSqueezyVariantSources {
	const plans: Array<{ planId: string; variantIds: VariantIdInput[] }> = [];

	for (const [planId, planConfig] of Object.entries(config.billing)) {
		if (!CHECKOUT_PLAN_IDS.has(planId) || !planConfig) continue;
		const variantIds: VariantIdInput[] = [];
		for (const currency of BILLING_CURRENCIES) {
			const amount = planConfig[currency]?.amount;
			if (amount) variantIds.push(amount.monthly, amount.yearly);
		}
		plans.push({ planId, variantIds });
	}

	for (const [planId, variantIds] of Object.entries(config.defaults)) {
		if (CHECKOUT_PLAN_IDS.has(planId) && variantIds) plans.push({ planId, variantIds: [...variantIds] });
	}

	for (const card of Object.values(config.pricingPlans ?? {})) {
		if (!card || typeof card !== 'object') continue;
		const { id, lemonVariantId } = card as { id?: unknown; lemonVariantId?: unknown };
		if (typeof id === 'string' && CHECKOUT_PLAN_IDS.has(id) && typeof lemonVariantId === 'string') {
			plans.push({ planId: id, variantIds: [lemonVariantId] });
		}
	}

	const sponsorAds = Object.entries(config.sponsorAds).map(([interval, variantId]) => ({
		interval,
		variantIds: [variantId]
	}));

	return { plans, sponsorAds };
}
