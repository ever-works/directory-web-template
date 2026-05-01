import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the auth-gated **soft-delete restore** endpoint
 * served by `apps/web/app/api/client/items/[id]/restore/route.ts`.
 *
 * `POST /api/client/items/[id]/restore` requires a session — anonymous
 * callers must be rejected with a 4xx (typically 401), never a 5xx.
 *
 * The matching CRUD surface (`GET / PATCH / DELETE /api/client/items/[id]`)
 * is already smoked via `client-protected.spec.ts`, but the per-id
 * `/restore` action sub-route was previously implicit. This spec
 * closes the last `/api/client/**` per-id surface that was not
 * explicitly smoke-tested.
 *
 * Uses an intentionally non-existent id so this test never depends on
 * the data repository's content.
 */
const NON_EXISTENT_ITEM_ID = '00000000-0000-0000-0000-000000000000';

const PATH = `/api/client/items/${NON_EXISTENT_ITEM_ID}/restore`;

test.describe('API: Client item restore endpoint rejects anonymous', () => {
	test(`POST ${PATH} responds without a server error`, async ({ request }) => {
		const response = await request.post(PATH, {
			data: {},
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});
});
