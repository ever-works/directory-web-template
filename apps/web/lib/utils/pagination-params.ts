/**
 * Parse `page` / `limit` query-string values into safe integers.
 *
 * A non-numeric value (`?page=abc`) makes `parseInt` return NaN, and
 * `Math.max(1, NaN)` is still NaN, so the resulting SQL OFFSET/LIMIT is NaN and
 * the query fails. Fall back to the defaults instead, and clamp to the bounds.
 */
export function parsePaginationParams(
	rawPage: string | null | undefined,
	rawLimit: string | null | undefined,
	options: { defaultLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number; offset: number } {
	const { defaultLimit = 10, maxLimit = 50 } = options;

	const parsedPage = Number.parseInt(rawPage ?? '', 10);
	const parsedLimit = Number.parseInt(rawLimit ?? '', 10);

	const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
	const limit = Number.isFinite(parsedLimit) ? Math.min(maxLimit, Math.max(1, parsedLimit)) : defaultLimit;

	return { page, limit, offset: (page - 1) * limit };
}
