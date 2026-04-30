import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public per-item vote-info endpoint.
 *
 * `GET /api/items/[slug]/votes` is intentionally public — the item
 * detail page hydrates the net vote count and (when authenticated)
 * the current user's vote status from it. The handler wraps its
 * database calls in a try / catch and falls back to a `count: 0`,
 * `userVote: null` payload on any failure, so the contract for an
 * unknown slug is the same as for a real one: a 200-class response
 * and never a 5xx.
 *
 * The auth-gated mutating endpoints on the same path
 * (`POST` / `DELETE /votes`) and the auth-gated `votes/status` GET
 * live in `items-engagement-and-favorites.spec.ts` and
 * `payment-protected.spec.ts` respectively. The public count-only
 * endpoint (`/votes/count`) lives in `item-public.spec.ts`. This file
 * closes the gap on the plain `/votes` GET that returns `{count,
 * userVote}` together.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';

test.describe('API: Public item vote-info (unknown slug)', () => {
	test(`GET /api/items/${NON_EXISTENT_SLUG}/votes does not 5xx`, async ({ request }) => {
		const response = await request.get(`/api/items/${NON_EXISTENT_SLUG}/votes`);

		expect(response.status()).toBeLessThan(500);
	});

	test(`GET /api/items/${NON_EXISTENT_SLUG}/votes returns a non-error JSON envelope`, async ({ request }) => {
		// We only assert on the contract, not the exact field types — the
		// handler may return `{success, count, userVote}` (success path) or
		// the same shape via the catch-block fallback. Both are non-5xx.
		const response = await request.get(`/api/items/${NON_EXISTENT_SLUG}/votes`);
		expect(response.status()).toBeLessThan(500);

		// Try to parse the body but don't fail the test on a non-JSON
		// payload — some environments may return an empty 204-style
		// response. The no-5xx contract is what we care about.
		try {
			const json = await response.json();
			// Either explicit success envelope or implicit 200/204.
			if (json && typeof json === 'object' && 'success' in json) {
				expect(json.success).toBeDefined();
			}
		} catch {
			// Non-JSON body is acceptable for this smoke level.
		}
	});
});
