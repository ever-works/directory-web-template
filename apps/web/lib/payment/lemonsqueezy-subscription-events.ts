import { SPONSOR_AD_TYPE } from './sponsor-ad-event';
import {
	sponsorAdActivationDecision,
	sponsorAdCancellationDecision,
	sponsorAdRenewalDecision
} from './sponsor-ad-lifecycle';
import {
	isInitialSubscriptionInvoice,
	toSubscriptionServiceData,
	type SubscriptionServiceInput,
	type WebhookResource
} from './lemonsqueezy-webhook';
import {
	matchLemonSqueezyVariant,
	type LemonSqueezyVariantCatalog,
	type LemonSqueezyVariantMatch
} from './lemonsqueezy-variant-plan';

/**
 * LemonSqueezy subscription events → plan rows and sponsor ads (spec 060 R8-R11).
 *
 * Nothing here trusts `meta.custom_data` to grant anything; the buyer controls it.
 *
 * - **Plans** come from the paid variant (`attributes.variant_id`) through the server's variant
 *   catalog. Only a plan variant can create a plan row or set its plan. Any other variant (a sponsor
 *   ad, or one no plan is configured for) can only update the status of a row that already exists.
 *   On `subscription_created` an unknown variant writes nothing and is acknowledged.
 * - **Invoices** carry no variant, so they never create a plan row either.
 * - **Sponsor ads** are activated only by a sponsor-ad variant whose interval matches the ad named in
 *   the custom data, and `confirmPayment` binds the ad to that subscription. Every later event acts
 *   on the ad only when the custom data names an ad already bound to the same subscription, so a
 *   plan subscription carrying someone's `sponsorAdId` cannot renew or cancel that ad.
 *
 * The dependencies are injected so the decisions can be unit-tested without a database.
 */

interface ServiceResult {
	success: boolean;
	error?: string;
}

interface WriteOptions {
	createIfMissing?: boolean;
}

/** The `WebhookSubscriptionService` methods the LemonSqueezy webhook calls. */
export interface PlanSubscriptionWriter {
	handleSubscriptionCreated(data: SubscriptionServiceInput): Promise<ServiceResult>;
	handleSubscriptionUpdated(data: SubscriptionServiceInput, options?: WriteOptions): Promise<ServiceResult>;
	handleSubscriptionCancelled(data: SubscriptionServiceInput): Promise<ServiceResult>;
	handleSubscriptionPaymentSucceeded(data: SubscriptionServiceInput, options?: WriteOptions): Promise<ServiceResult>;
	handleSubscriptionPaymentFailed(data: SubscriptionServiceInput): Promise<ServiceResult>;
	handleSubscriptionTrialEnding(data: SubscriptionServiceInput): Promise<ServiceResult>;
}

/** The fields of a sponsor ad these decisions read. */
export interface SponsorAdRecord {
	id: string;
	status: string;
	interval: string;
	subscriptionId?: string | null;
}

/** The `sponsorAdService` methods the LemonSqueezy webhook calls. */
export interface SponsorAdWriter {
	getSponsorAdById(id: string): Promise<SponsorAdRecord | null>;
	confirmPayment(id: string, subscriptionId?: string, customerId?: string): Promise<unknown>;
	cancelSponsorAd(id: string, cancelReason?: string): Promise<unknown>;
	renewSponsorAd(id: string): Promise<unknown>;
}

export interface LemonSqueezySubscriptionEventDeps {
	plans: PlanSubscriptionWriter;
	sponsorAds: SponsorAdWriter;
	loadVariantCatalog: () => Promise<LemonSqueezyVariantCatalog>;
	now?: () => number;
	logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

/** A subscription or subscription-invoice resource, with the event `meta` (custom data) attached. */
export type LemonSqueezySubscriptionResource = WebhookResource;

/** Each handler resolves true when the event is done (acknowledge), false to have it redelivered. */
export interface LemonSqueezySubscriptionEvents {
	created(resource: LemonSqueezySubscriptionResource): Promise<boolean>;
	updated(resource: LemonSqueezySubscriptionResource): Promise<boolean>;
	cancelled(resource: LemonSqueezySubscriptionResource): Promise<boolean>;
	paymentSucceeded(resource: LemonSqueezySubscriptionResource): Promise<boolean>;
	paymentFailed(resource: LemonSqueezySubscriptionResource): Promise<boolean>;
	trialEnding(resource: LemonSqueezySubscriptionResource): Promise<boolean>;
}

function toId(value: unknown): string | undefined {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function customData(resource: LemonSqueezySubscriptionResource): Record<string, unknown> {
	const custom = resource.meta?.custom_data;
	return custom && typeof custom === 'object' ? custom : {};
}

function sponsorAdIdOf(resource: LemonSqueezySubscriptionResource): string | null {
	const id = customData(resource).sponsorAdId;
	return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export function createLemonSqueezySubscriptionEvents(
	deps: LemonSqueezySubscriptionEventDeps
): LemonSqueezySubscriptionEvents {
	const log = deps.logger ?? console;
	const now = deps.now ?? Date.now;
	const { plans, sponsorAds } = deps;

	/** Any thrown error (catalog, database) makes the event retry. */
	const guarded =
		(label: string, handle: (resource: LemonSqueezySubscriptionResource) => Promise<boolean>) =>
		async (resource: LemonSqueezySubscriptionResource): Promise<boolean> => {
			try {
				return await handle(resource);
			} catch (error) {
				log.error(`❌ Error handling LemonSqueezy ${label}:`, error);
				return false;
			}
		};

	async function runPlan(label: string, call: () => Promise<ServiceResult>): Promise<boolean> {
		const result = await call();
		if (result.success) {
			log.log(`✅ LemonSqueezy ${label} handled successfully`);
			return true;
		}
		log.error(`❌ Failed to handle ${label}:`, result.error);
		return false;
	}

	async function variantOf(resource: LemonSqueezySubscriptionResource): Promise<LemonSqueezyVariantMatch> {
		return matchLemonSqueezyVariant(await deps.loadVariantCatalog(), resource.attributes?.variant_id);
	}

	function warnUnknownVariant(resource: LemonSqueezySubscriptionResource, action: string) {
		log.warn(
			`⚠️ LemonSqueezy subscription ${resource.id}: variant ${String(resource.attributes?.variant_id)} is not a ` +
				`configured plan or sponsor-ad variant; ${action}`
		);
	}

	/** The ad named in the custom data, only when it is already bound to this subscription. */
	async function boundSponsorAd(
		resource: LemonSqueezySubscriptionResource,
		subscriptionId: string | undefined
	): Promise<SponsorAdRecord | null> {
		const sponsorAdId = sponsorAdIdOf(resource);
		if (!sponsorAdId || !subscriptionId) return null;
		const ad = await sponsorAds.getSponsorAdById(sponsorAdId);
		return ad?.subscriptionId && ad.subscriptionId === subscriptionId ? ad : null;
	}

	async function activateSponsorAd(resource: LemonSqueezySubscriptionResource, interval: string): Promise<boolean> {
		const sponsorAdId = sponsorAdIdOf(resource);
		if (customData(resource).type !== SPONSOR_AD_TYPE || !sponsorAdId) {
			// Renewal subscriptions (`sponsor_ad_renewal`) are not handled for LemonSqueezy yet.
			log.warn(
				`⚠️ LemonSqueezy sponsor-ad subscription ${resource.id} is not a first purchase of a named ad; acknowledged`
			);
			return true;
		}

		const ad = await sponsorAds.getSponsorAdById(sponsorAdId);
		if (!ad) {
			log.error(`❌ Sponsor ad ${sponsorAdId} for LemonSqueezy subscription ${resource.id} not found`);
			return true; // redelivery cannot create the ad
		}
		if (ad.interval !== interval) {
			log.error(
				`❌ LemonSqueezy subscription ${resource.id} paid the ${interval} sponsor-ad variant, ` +
					`but sponsor ad ${ad.id} is ${ad.interval}; not activated`
			);
			return true;
		}
		if (sponsorAdActivationDecision(ad.status) !== 'act') {
			// Already confirmed (a redelivery) or moved on: confirmPayment would throw, and no retry
			// can change that, so acknowledge it (lib/payment/sponsor-ad-lifecycle.ts).
			log.warn(`⚠️ Sponsor ad ${ad.id} is ${ad.status}; LemonSqueezy subscription ${resource.id} acknowledged`);
			return true;
		}

		log.log(`🔄 Confirming payment for sponsor ad via LemonSqueezy: ${ad.id}`);
		const confirmed = await sponsorAds.confirmPayment(ad.id, resource.id, toId(resource.attributes?.customer_id));
		if (!confirmed) {
			// As in the Stripe and Polar handlers: a paid ad left awaiting payment is retried.
			log.error(`❌ Failed to confirm sponsor ad payment: ${ad.id}`);
			return false;
		}
		log.log(`✅ Sponsor ad payment confirmed, now pending admin review: ${ad.id}`);
		return true;
	}

	return {
		created: guarded('subscription created', async (resource) => {
			const variant = await variantOf(resource);
			if (variant.kind === 'plan') {
				return runPlan('subscription created', () =>
					plans.handleSubscriptionCreated(toSubscriptionServiceData(resource, now(), variant.planId))
				);
			}
			if (variant.kind === 'sponsor_ad') return activateSponsorAd(resource, variant.interval);

			warnUnknownVariant(resource, 'no subscription row written');
			return true;
		}),

		updated: guarded('subscription updated', async (resource) => {
			const variant = await variantOf(resource);
			if (variant.kind === 'plan') {
				return runPlan('subscription updated', () =>
					plans.handleSubscriptionUpdated(toSubscriptionServiceData(resource, now(), variant.planId))
				);
			}

			// Not a plan variant: it may only update the status and dates of an existing plan row
			// (a plan subscription switched to another variant); it never creates one or sets its plan.
			if (variant.kind === 'unknown') warnUnknownVariant(resource, 'only an existing row is updated');
			return runPlan('subscription updated', () =>
				plans.handleSubscriptionUpdated(toSubscriptionServiceData(resource, now()), { createIfMissing: false })
			);
		}),

		cancelled: guarded('subscription cancelled', async (resource) => {
			const ad = await boundSponsorAd(resource, resource.id);
			if (ad) {
				if (sponsorAdCancellationDecision(ad.status) !== 'act') {
					log.log(`📢 Sponsor ad ${ad.id} is already ${ad.status}; LemonSqueezy cancellation acknowledged`);
					return true;
				}
				log.log(`🔄 Cancelling sponsor ad via LemonSqueezy: ${ad.id}`);
				const cancelledAd = await sponsorAds.cancelSponsorAd(ad.id, 'LemonSqueezy subscription cancelled');
				if (cancelledAd) log.log(`✅ Sponsor ad cancelled successfully: ${ad.id}`);
				else log.error(`❌ Failed to cancel sponsor ad: ${ad.id}`);
				return true;
			}

			if ((await variantOf(resource)).kind === 'sponsor_ad') {
				log.warn(
					`⚠️ LemonSqueezy sponsor-ad subscription ${resource.id} cancelled, but no sponsor ad is bound to it`
				);
				return true;
			}

			return runPlan('subscription cancelled', () =>
				plans.handleSubscriptionCancelled(toSubscriptionServiceData(resource, now()))
			);
		}),

		paymentSucceeded: guarded('subscription payment succeeded', async (resource) => {
			const ad = await boundSponsorAd(resource, toId(resource.attributes?.subscription_id));
			if (ad) {
				// The first invoice pays for the period subscription_created already confirmed;
				// only later invoices extend the ad.
				if (isInitialSubscriptionInvoice(resource)) {
					log.log('📢 LemonSqueezy sponsor ad initial payment acknowledged');
					return true;
				}
				const decision = sponsorAdRenewalDecision(ad.status);
				if (decision !== 'act') {
					// `retry`: still pending payment or admin review, which may change; otherwise the ad
					// was cancelled or rejected and a redelivery cannot renew it.
					log.warn(`⚠️ Sponsor ad ${ad.id} is ${ad.status}; LemonSqueezy renewal ${decision}`);
					return decision === 'acknowledge';
				}
				log.log(`🔄 Renewing sponsor ad via LemonSqueezy: ${ad.id}`);
				const renewedAd = await sponsorAds.renewSponsorAd(ad.id);
				if (renewedAd) log.log(`✅ Sponsor ad renewed successfully: ${ad.id}`);
				else log.error(`❌ Failed to renew sponsor ad: ${ad.id}`);
				return true;
			}

			// An invoice has no variant, so it cannot say which plan was bought: it only updates a
			// plan row that subscription_created (or an update on a plan variant) already wrote.
			return runPlan('subscription payment succeeded', () =>
				plans.handleSubscriptionPaymentSucceeded(toSubscriptionServiceData(resource, now()), {
					createIfMissing: false
				})
			);
		}),

		paymentFailed: guarded('subscription payment failed', async (resource) => {
			if (await boundSponsorAd(resource, toId(resource.attributes?.subscription_id))) {
				log.log('📢 LemonSqueezy sponsor ad payment failure acknowledged');
				return true; // a sponsor ad has no plan row to update
			}

			return runPlan('subscription payment failed', () =>
				plans.handleSubscriptionPaymentFailed(toSubscriptionServiceData(resource, now()))
			);
		}),

		trialEnding: guarded('subscription trial ending', async (resource) =>
			runPlan('subscription trial ending', () =>
				plans.handleSubscriptionTrialEnding(toSubscriptionServiceData(resource, now()))
			)
		)
	};
}
