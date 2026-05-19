import { test, expect, type APIRequestContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

/**
 * EW-120 — HTTP coverage for the pull-mode endpoint at
 * `GET /api/platform/activity-feed`.
 *
 * Two failure modes the platform side classifies differently:
 *   - 503 `not_provisioned` when env vars (`PLATFORM_SYNC_SECRET`,
 *     `PLATFORM_WORK_ID`) are missing.
 *   - 401 `unauthorized` for any signature-related failure
 *     (missing / malformed / stale / bad bytes).
 *
 * The suite probes once at the top to decide which environment it is
 * in, then runs the matching assertion set. CI defaults to missing
 * env vars and exercises the 503 path; a local `.env.local` with
 * both keys set unlocks the full 401 + 400 + 200 happy-path coverage.
 *
 * Spec: docs/spec/024-ew-120-platform-activity-feed/
 */

const ENDPOINT = '/api/platform/activity-feed';

type Mode = 'provisioned' | 'unprovisioned';

let detectedMode: Mode | null = null;

async function detectMode(request: APIRequestContext): Promise<Mode> {
	if (detectedMode) return detectedMode;
	const response = await request.get(ENDPOINT);
	const status = response.status();
	if (status === 503) {
		detectedMode = 'unprovisioned';
	} else if (status === 400 || status === 401) {
		detectedMode = 'provisioned';
	} else {
		// Anything else (200, 5xx other than 503, etc.) is unexpected —
		// surface it so the test failure is obvious rather than skipping
		// silently.
		throw new Error(`Unexpected baseline status ${status} from ${ENDPOINT}`);
	}
	return detectedMode;
}

/**
 * Mirror of `apps/web/lib/services/platform-activity-feed/hmac.ts`
 * `canonicaliseQuery` — copied here so the test exercises the wire
 * contract independently of the production helper.
 */
function canonicaliseQuery(q: { since: string | null; limit: number; types: string }): string {
	const pairs: Array<[string, string]> = [];
	if (q.since) pairs.push(['since', q.since]);
	pairs.push(['limit', String(q.limit)]);
	pairs.push(['types', q.types]);
	pairs.sort(([a], [b]) => a.localeCompare(b));
	return pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

function sign(timestamp: string, queryString: string, workId: string, secret: string): string {
	return createHmac('sha256', secret).update(`${timestamp}:${queryString}:${workId}`).digest('hex');
}

test.describe('API: GET /api/platform/activity-feed — unprovisioned env', () => {
	test('responds 503 when env vars are missing', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'unprovisioned', 'PLATFORM_SYNC_SECRET / PLATFORM_WORK_ID set; running provisioned suite instead');

		const response = await request.get(ENDPOINT);
		expect(response.status()).toBe(503);
		const body = (await response.json()) as { error?: string };
		expect(typeof body.error).toBe('string');
	});

	test('503 still wins over a forged signature when env is missing', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'unprovisioned', 'env is set');

		const response = await request.get(`${ENDPOINT}?limit=10&types=all`, {
			headers: {
				authorization: 'Bearer deadbeef',
				'x-platform-ts': new Date().toISOString()
			}
		});
		// 503 must take priority — the platform classifies it as
		// `not_provisioned`, not `unauthorized`. Leaking 401 here would
		// mean the operator sees a misleading banner.
		expect(response.status()).toBe(503);
	});
});

test.describe('API: GET /api/platform/activity-feed — provisioned env', () => {
	const secret = process.env.PLATFORM_SYNC_SECRET;
	const workId = process.env.PLATFORM_WORK_ID;

	test('rejects request with no Authorization header', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set — see unprovisioned suite');
		const response = await request.get(`${ENDPOINT}?limit=10&types=all`);
		expect([401, 403]).toContain(response.status());
	});

	test('rejects request with a non-Bearer Authorization header', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set');
		const response = await request.get(`${ENDPOINT}?limit=10&types=all`, {
			headers: { authorization: 'Basic abc', 'x-platform-ts': new Date().toISOString() }
		});
		expect([401, 403]).toContain(response.status());
	});

	test('rejects request with missing x-platform-ts header', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set');
		test.skip(!secret || !workId, 'no secret/workId visible to test process');
		const ts = new Date().toISOString();
		const qs = canonicaliseQuery({ since: null, limit: 10, types: 'all' });
		const sig = sign(ts, qs, workId!, secret!);
		const response = await request.get(`${ENDPOINT}?limit=10&types=all`, {
			headers: { authorization: `Bearer ${sig}` }
		});
		expect([401, 403]).toContain(response.status());
	});

	test('rejects request with stale x-platform-ts (>5 min drift)', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set');
		test.skip(!secret || !workId, 'no secret/workId visible to test process');
		const staleTs = new Date(Date.now() - 10 * 60 * 1000).toISOString();
		const qs = canonicaliseQuery({ since: null, limit: 10, types: 'all' });
		const sig = sign(staleTs, qs, workId!, secret!);
		const response = await request.get(`${ENDPOINT}?limit=10&types=all`, {
			headers: { authorization: `Bearer ${sig}`, 'x-platform-ts': staleTs }
		});
		expect([401, 403]).toContain(response.status());
	});

	test('rejects tampered query (signature was computed for different params)', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set');
		test.skip(!secret || !workId, 'no secret/workId visible to test process');
		const ts = new Date().toISOString();
		// Sign for limit=10, then send limit=20 — signature must not match.
		const sig = sign(ts, canonicaliseQuery({ since: null, limit: 10, types: 'all' }), workId!, secret!);
		const response = await request.get(`${ENDPOINT}?limit=20&types=all`, {
			headers: { authorization: `Bearer ${sig}`, 'x-platform-ts': ts }
		});
		expect([401, 403]).toContain(response.status());
	});

	test('rejects single-byte flipped signature with constant-time compare', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set');
		test.skip(!secret || !workId, 'no secret/workId visible to test process');
		const ts = new Date().toISOString();
		const qs = canonicaliseQuery({ since: null, limit: 10, types: 'all' });
		const sig = sign(ts, qs, workId!, secret!);
		// Flip the first hex char — equal-length buffer, just wrong byte.
		const tampered = (sig[0] === '0' ? '1' : '0') + sig.slice(1);
		const response = await request.get(`${ENDPOINT}?limit=10&types=all`, {
			headers: { authorization: `Bearer ${tampered}`, 'x-platform-ts': ts }
		});
		expect([401, 403]).toContain(response.status());
	});

	test('returns 200 + entries/nextCursor/serverTime for a valid signed request', async ({ request }) => {
		const mode = await detectMode(request);
		test.skip(mode !== 'provisioned', 'env not set');
		test.skip(!secret || !workId, 'no secret/workId visible to test process');
		const ts = new Date().toISOString();
		const qs = canonicaliseQuery({ since: null, limit: 5, types: 'all' });
		const sig = sign(ts, qs, workId!, secret!);
		const response = await request.get(`${ENDPOINT}?${qs}`, {
			headers: { authorization: `Bearer ${sig}`, 'x-platform-ts': ts }
		});
		expect(response.status()).toBe(200);
		const body = (await response.json()) as {
			entries: unknown[];
			nextCursor: string | null;
			serverTime: string;
		};
		expect(Array.isArray(body.entries)).toBe(true);
		expect(typeof body.serverTime).toBe('string');
		expect(Number.isFinite(Date.parse(body.serverTime))).toBe(true);
		// nextCursor can be either null or a parseable timestamp string.
		if (body.nextCursor !== null) {
			expect(typeof body.nextCursor).toBe('string');
			expect(Number.isFinite(Date.parse(body.nextCursor))).toBe(true);
		}
	});
});

test.describe('API: GET /api/platform/activity-feed — query validation (mode-independent)', () => {
	// Bad query is rejected with 400 BEFORE the signature check, so it
	// fires regardless of whether the env is provisioned. Verify the
	// route degrades cleanly on garbage input. 400 (zod validation) is the
	// documented happy path, 503 (not_provisioned) is the documented
	// graceful-degradation path when PLATFORM_SYNC_SECRET is unset (the
	// CI case). The forbidden outcome is a 500 with no body.

	test('rejects out-of-range limit with 4xx or degraded 503', async ({ request }) => {
		const response = await request.get(`${ENDPOINT}?limit=999999&types=all`);
		expect([400, 403, 503]).toContain(response.status());
	});

	test('rejects invalid types csv with 4xx or degraded 503', async ({ request }) => {
		const response = await request.get(`${ENDPOINT}?limit=10&types=bogus`);
		expect([400, 403, 503]).toContain(response.status());
	});

	test('rejects malformed since (not ISO 8601) with 4xx or degraded 503', async ({ request }) => {
		const response = await request.get(`${ENDPOINT}?since=not-a-date&limit=10&types=all`);
		expect([400, 403, 503]).toContain(response.status());
	});
});
