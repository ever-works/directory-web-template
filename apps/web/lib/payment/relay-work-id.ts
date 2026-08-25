type RelayEventLike = { data?: { object?: unknown } };

/** Read the routing key from every Stripe object location supported by the relay. */
export function extractRelayWorkId(event: RelayEventLike): string | null {
	const object = (event.data?.object ?? {}) as Record<string, unknown>;
	const read = (metadata: unknown): string | null => {
		const value = (metadata as { work_id?: unknown } | undefined)?.work_id;
		return typeof value === 'string' && value.trim() ? value.trim() : null;
	};

	const direct = read((object as { metadata?: unknown }).metadata);
	if (direct) return direct;

	const parentSubscriptionDetails = read(
		(
			object as {
				parent?: { subscription_details?: { metadata?: unknown } };
			}
		).parent?.subscription_details?.metadata
	);
	if (parentSubscriptionDetails) return parentSubscriptionDetails;

	const subscriptionDetails = read(
		(object as { subscription_details?: { metadata?: unknown } }).subscription_details?.metadata
	);
	if (subscriptionDetails) return subscriptionDetails;

	const lines = (object as { lines?: { data?: Array<{ metadata?: unknown }> } }).lines?.data;
	if (Array.isArray(lines)) {
		for (const line of lines) {
			const lineWorkId = read(line?.metadata);
			if (lineWorkId) return lineWorkId;
		}
	}

	return null;
}
