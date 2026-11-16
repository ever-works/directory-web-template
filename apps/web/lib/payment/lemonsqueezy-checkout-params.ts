/**
 * The parameters `POST /api/lemonsqueezy/checkout` sends to LemonSqueezy (spec 060 R10).
 *
 * Only the variant and the dark-mode flag come from the client. The price is the variant's own
 * (a client `customPrice` is never forwarded), and the checkout custom data, which the webhook
 * reads back, is set here from the session. Client `metadata`, `planId`, `type` or `sponsorAdId`
 * never reach it: the webhook takes the plan from the paid variant, and the sponsor-ad checkout
 * (`/api/sponsor-ads/checkout`) sets its own custom data on the server.
 */

export interface CheckoutSessionUser {
	id?: string;
	email?: string | null;
	name?: string | null;
}

export interface LemonSqueezyCheckoutParams {
	email?: string;
	variantId?: number;
	dark?: boolean;
	metadata: { userId?: string; email?: string; name?: string };
}

/** `body` has passed `validateCheckoutRequestBody` (variantId a positive integer, dark coerced). */
export function buildLemonSqueezyCheckoutParams(
	user: CheckoutSessionUser,
	body: Record<string, unknown>
): LemonSqueezyCheckoutParams {
	// A session without an email sends none, as before (not an empty string).
	const email = user.email ?? undefined;
	return {
		email,
		variantId: body.variantId === undefined || body.variantId === null ? undefined : Number(body.variantId),
		dark: typeof body.dark === 'boolean' ? body.dark : undefined,
		metadata: { userId: user.id, email, name: user.name ?? undefined }
	};
}
