/**
 * Strict parsing for an optional non-negative integer query parameter that is compared with a
 * Postgres `integer` column (for example `client_profiles.total_submissions`).
 *
 * `Number(v)` reads `""` and `"  "` as 0, `"0x10"` as 16 and `"1e2"` as 100, and a value past the
 * 32-bit column range makes Postgres throw, so the route answers 500 instead of 400. Here a
 * missing, empty or whitespace value is "no value", only a plain run of digits up to
 * `MAX_INT32` is a number, and anything else is reported as invalid so the route can answer 400.
 */

/** Largest value a Postgres `integer` column holds. */
export const MAX_INT32 = 2_147_483_647;

export type NonNegativeIntParam = { ok: true; value: number | undefined } | { ok: false };

const DIGITS = /^\d+$/;

export function parseNonNegativeIntParam(raw: string | null | undefined): NonNegativeIntParam {
	const trimmed = (raw ?? '').trim();
	if (!trimmed) return { ok: true, value: undefined };
	if (!DIGITS.test(trimmed)) return { ok: false };

	const value = Number(trimmed);
	return value <= MAX_INT32 ? { ok: true, value } : { ok: false };
}
