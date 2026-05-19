import { test, expect } from '@playwright/test';

// Many API routes ship Swagger JSDoc annotations. If a Swagger generator
// endpoint is exposed at /api/swagger or /api/openapi, this spec ensures
// it's at least reachable and not 5xxing.

const SWAGGER_PATHS = ['/api/swagger', '/api/openapi', '/api/docs', '/api-docs'];

test.describe('Swagger / OpenAPI doc endpoints (if present)', () => {
	for (const path of SWAGGER_PATHS) {
		test(`${path} responds non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			// Accept 404 (not configured) gracefully; just no 5xx.
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}
});
