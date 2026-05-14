import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Maximum allowed drift between the platform's `x-platform-ts` header and
 * this server's wall clock. The platform applies the same 5-minute cap when
 * receiving our response (see `DirectoryWebsiteClient.parseResponse`), so a
 * fresh signature is only valid for ~5 minutes either way. Replays older than
 * that are rejected up-front.
 */
export const MAX_DRIFT_MS = 5 * 60 * 1000;

export type CanonicalQuery = {
	since: string | null;
	limit: number;
	types: string;
};

/**
 * Rebuild the exact query string the platform signs in
 * `DirectoryWebsiteClient.serialiseQuery`: lexicographically-sorted, URI-
 * encoded `key=value` pairs joined by `&`, with `since` omitted when absent.
 *
 * We MUST regenerate the canonical form rather than using `URL.search`
 * verbatim — Next.js / proxies can normalise param order, and any extra
 * query params (e.g. cache busters from the edge) would otherwise be folded
 * into the signed string and silently break verification.
 */
export function canonicaliseQuery(q: CanonicalQuery): string {
	const pairs: Array<[string, string]> = [];
	if (q.since) pairs.push(['since', q.since]);
	pairs.push(['limit', String(q.limit)]);
	pairs.push(['types', q.types]);
	pairs.sort(([a], [b]) => a.localeCompare(b));
	return pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export type HmacVerifyInput = {
	authorizationHeader: string | null;
	timestampHeader: string | null;
	canonicalQuery: string;
	workId: string;
	secret: string;
	now?: number;
};

export type HmacVerifyResult =
	| { ok: true }
	| { ok: false; reason: 'missing_auth' | 'malformed_auth' | 'missing_ts' | 'invalid_ts' | 'stale_ts' | 'bad_signature' };

/**
 * Verify the HMAC-SHA256 bearer signature the platform attaches to its pull
 * request. Mirrors `DirectoryWebsiteClient.sign`:
 *
 *     HMAC-SHA256(secret, `${timestamp}:${queryString}:${workId}`)
 *
 * The work ID is part of the signed payload so a stolen secret for one Work
 * can't be replayed against another Work hosted on the same template
 * instance. The timestamp is rejected if it drifts more than 5 minutes.
 *
 * Comparison is `timingSafeEqual` against an equal-length buffer so the
 * branch cost is uniform regardless of attacker-controlled token length.
 */
export function verifyPlatformSignature(input: HmacVerifyInput): HmacVerifyResult {
	const { authorizationHeader, timestampHeader, canonicalQuery, workId, secret } = input;
	if (!authorizationHeader) return { ok: false, reason: 'missing_auth' };
	if (!authorizationHeader.startsWith('Bearer ')) return { ok: false, reason: 'malformed_auth' };
	const provided = authorizationHeader.slice('Bearer '.length).trim();
	if (provided.length === 0) return { ok: false, reason: 'malformed_auth' };

	if (!timestampHeader) return { ok: false, reason: 'missing_ts' };
	const tsMs = Date.parse(timestampHeader);
	if (!Number.isFinite(tsMs)) return { ok: false, reason: 'invalid_ts' };
	const now = input.now ?? Date.now();
	if (Math.abs(now - tsMs) > MAX_DRIFT_MS) return { ok: false, reason: 'stale_ts' };

	const expected = createHmac('sha256', secret)
		.update(`${timestampHeader}:${canonicalQuery}:${workId}`)
		.digest('hex');

	const expectedBuf = Buffer.from(expected, 'utf8');
	const providedBuf = Buffer.from(provided, 'utf8');
	const lengthsMatch = expectedBuf.length === providedBuf.length;
	const comparisonBuf = lengthsMatch ? providedBuf : Buffer.alloc(expectedBuf.length);
	const bytesMatch = timingSafeEqual(expectedBuf, comparisonBuf);
	if (!lengthsMatch || !bytesMatch) return { ok: false, reason: 'bad_signature' };

	return { ok: true };
}
