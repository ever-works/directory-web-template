/**
 * Parse `page` / `limit` query-string values into safe integers.
 *
 * A non-numeric value (`?page=abc`) makes `parseInt` return NaN, and
 * `Math.max(1, NaN)` is still NaN, so the resulting SQL OFFSET/LIMIT is NaN and
 * the query fails. Fall back to the defaults instead, and clamp to the bounds.
 *
 * `page` is capped as well: `?page=99999999999999999999` is a finite 1e20, whose
 * OFFSET is outside what the database accepts. The cap keeps the offset small
 * and exact; a page that far out is simply an empty page.
 */
export const MAX_PAGE = 100_000;

export function parsePaginationParams(
	rawPage: string | null | undefined,
	rawLimit: string | null | undefined,
	options: { defaultLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number; offset: number } {
	const { defaultLimit = 10, maxLimit = 50 } = options;

	const parsedPage = Number.parseInt(rawPage ?? '', 10);
	const parsedLimit = Number.parseInt(rawLimit ?? '', 10);

	const page = Number.isFinite(parsedPage) ? Math.min(MAX_PAGE, Math.max(1, parsedPage)) : 1;
	// The fallback is clamped too, so a custom default above the cap cannot exceed it.
	const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : defaultLimit));

	return { page, limit, offset: (page - 1) * limit };
}
