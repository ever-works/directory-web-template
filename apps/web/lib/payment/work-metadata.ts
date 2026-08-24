/**
 * Stamps the owning Work id onto every Stripe object this directory creates.
 *
 * WHY THIS EXISTS
 *
 * Stripe caps an account at **16 live webhook endpoints**, so one endpoint per
 * directory site cannot scale — the shared account is already full and several
 * directories have no slot at all. The platform therefore owns a SINGLE Stripe
 * endpoint and relays each event to the directory that owns it
 * (`knowledge/runbooks/EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in `ever-works/workspace`).
 *
 * A Stripe event does not name the directory, so the relay needs a routing key
 * carried on the object itself. `metadata.work_id` is that key.
 *
 * 🛑 Stripe does NOT copy a Checkout Session's `metadata` onto the Subscription
 * or PaymentIntent it creates. `subscription_data.metadata` /
 * `payment_intent_data.metadata` must be set explicitly, or the very events the
 * relay most needs to route (`customer.subscription.*`, `invoice.*`,
 * `payment_intent.*`) arrive with no routing key at all.
 */

/** Metadata key the relay reads. Keep in sync with the platform relay. */
export const WORK_ID_METADATA_KEY = 'work_id';

/**
 * The Work this deployment serves, or `null` when the site is not
 * platform-provisioned (local dev, self-hosted fork). Returning `null` rather
 * than throwing keeps checkout working for those deployments — they simply keep
 * using their own webhook endpoint.
 */
export function getWorkId(): string | null {
	const workId = (process.env.PLATFORM_WORK_ID || process.env.WORK_ID || '').trim();
	return workId.length > 0 ? workId : null;
}

/**
 * Merge `work_id` into a metadata bag without disturbing existing entries.
 * Caller-supplied values win, so this can never clobber a deliberate override.
 */
export function withWorkMetadata<T extends Record<string, string> | undefined>(
	metadata?: T
): Record<string, string> | undefined {
	const workId = getWorkId();
	if (!workId) return metadata;
	return { [WORK_ID_METADATA_KEY]: workId, ...(metadata ?? {}) };
}

/**
 * Stamp `work_id` across a Checkout Session / PaymentIntent / Subscription /
 * SetupIntent params object, including the nested `subscription_data` and
 * `payment_intent_data` bags that Stripe does NOT populate from the session's
 * own metadata.
 *
 * Applied at the call site so every object this directory creates is routable,
 * without touching each individual metadata literal.
 */
export function stampWorkId<T extends Record<string, unknown>>(params: T): T {
	const workId = getWorkId();
	if (!workId) return params;

	const stamped: Record<string, unknown> = {
		...params,
		metadata: withWorkMetadata(params.metadata as Record<string, string> | undefined)
	};

	for (const nested of ['subscription_data', 'payment_intent_data'] as const) {
		const value = params[nested];
		// Only extend a bag the caller already builds: adding `subscription_data`
		// to a `mode: 'payment'` session (or vice versa) is a Stripe 400.
		if (value && typeof value === 'object') {
			stamped[nested] = {
				...(value as Record<string, unknown>),
				metadata: withWorkMetadata(
					(value as { metadata?: Record<string, string> }).metadata
				)
			};
		}
	}

	return stamped as T;
}
