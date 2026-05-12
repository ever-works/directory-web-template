/**
 * Shared helpers for the /client/profile/[username]/followers and /following
 * pages. Pulled out so both pages share the same pagination semantics and
 * page-size constant without duplicating it.
 */
export const FOLLOW_LIST_PAGE_SIZE = 30;

export function parsePageParam(input: string | string[] | undefined): number {
	const value = Array.isArray(input) ? input[0] : input;
	const parsed = Number.parseInt(value ?? '1', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return parsed;
}
