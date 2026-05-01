import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public items-export endpoint's **query-param
 * surface** served by `apps/web/app/api/items/export/route.ts`.
 *
 * `GET /api/items/export` is conditionally public (gated by
 * `export_enabled` in `config.yml` — when disabled the route returns
 * `403`). When enabled it accepts a single query parameter:
 *
 *   - `format` — Zod-validated enum (`'csv' | 'xlsx'`) with `'csv'`
 *                default; an unknown value (`format=invalid`) is
 *                rejected by Zod and routed through
 *                `safeErrorResponse(...)` to a 4xx response.
 *
 * The single happy-path entry (`/api/items/export`) is already smoked
 * by `discovery.spec.ts`. This spec adds the **query-param surface**
 * so a regression in the Zod schema (`exportQuerySchema`), the
 * default-format fallback, the format-rejection path, or the
 * `getExportEnabled()` feature-flag short-circuit is caught
 * explicitly. None of the cases here may 5xx — that would indicate
 * the route's rate-limit / parse / export plumbing crashed before
 * the response renderer.
 *
 * Payload shape and `Content-Type` are intentionally not asserted
 * because the response is either a 403 / 4xx JSON envelope or a
 * binary CSV / XLSX stream depending on whether the export feature
 * flag is on for the active config repository.
 */
const ITEMS_EXPORT_QUERIES = [
	// Baseline — same path as discovery.spec.ts; included so a future
	// reader of this file sees the no-arg case alongside the variants.
	'/api/items/export',

	// `format` — both members of the Zod enum.
	'/api/items/export?format=csv',
	'/api/items/export?format=xlsx',

	// `format` — empty string. Zod rejects (enum has no empty-string
	// member) and the route routes the error through
	// `safeErrorResponse(...)` to a 4xx. The default-on-omit path
	// does not apply because the param is present-but-empty.
	'/api/items/export?format=',

	// `format` — unknown value. Same `safeErrorResponse` 4xx path.
	'/api/items/export?format=invalid',
	'/api/items/export?format=json',

	// `format` — case sensitivity. The Zod enum is case-sensitive, so
	// uppercase variants are rejected (4xx) rather than silently
	// coerced.
	'/api/items/export?format=CSV',
	'/api/items/export?format=XLSX',

	// Extra unknown query params are silently ignored by the schema
	// (Zod's default `passthrough` is off but the route only reads
	// `format`, so unknown keys do not affect the parse result).
	'/api/items/export?format=csv&unknown=value',
] as const;

test.describe('API: /api/items/export query-param surface', () => {
	for (const path of ITEMS_EXPORT_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}
});
