/**
 * Parse `page` / `limit` query-string values into safe integers.
 *
 * A non-numeric value (`?page=abc`) makes `parseInt` return NaN, and
 * `Math.max(1, NaN)` is still NaN, so the resulting SQL OFFSET/LIMIT is NaN and
 * the query fails. Fall back to the defaults instead, and clamp to the bounds.
 *
 * Only a plain whole number is accepted (optional leading `-`, then digits). A
 * malformed prefix such as `2abc` or `1.5`, or an integer too large to be exact
 * (`9007199254740993`), is not silently read as a different page or size: it
 * falls back to the default.
 *
 * `page` is capped as well, so the OFFSET stays small and exact; a page that far
 * out is simply an empty page.
 */
export const MAX_PAGE = 100_000;

const WHOLE_NUMBER = /^-?\d+$/;

function parseWholeNumber(raw: string | null | undefined): number | null {
	const value = (raw ?? '').trim();
	if (!WHOLE_NUMBER.test(value)) return null;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parsePaginationParams(
	rawPage: string | null | undefined,
	rawLimit: string | null | undefined,
	options: { defaultLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number; offset: number } {
	const { defaultLimit = 10, maxLimit = 50 } = options;

	const parsedPage = parseWholeNumber(rawPage);
	const parsedLimit = parseWholeNumber(rawLimit);

	const page = parsedPage === null ? 1 : Math.min(MAX_PAGE, Math.max(1, parsedPage));
	// The fallback goes through the same bounds, so a custom default above the cap cannot exceed it.
	const limit = Math.min(maxLimit, Math.max(1, parsedLimit ?? defaultLimit));

	return { page, limit, offset: (page - 1) * limit };
}
