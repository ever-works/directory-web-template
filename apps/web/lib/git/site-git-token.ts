/**
 * The site's credential for ITS OWN data repository.
 *
 * Two sources, in this order:
 *
 * 1. **The platform's site git-token broker**, when both
 *    `EVER_WORKS_SITE_GIT_TOKEN_URL` and `EVER_WORKS_SITE_GIT_TOKEN_SECRET`
 *    are set (Ever Works sets them on deploy). The site POSTs its per-site
 *    secret and gets back a GitHub token narrowed to its one data repo with
 *    Contents: write, valid about one hour. It is cached in memory and
 *    refreshed five minutes before it expires, and once more when GitHub
 *    rejects it (see {@link siteGitAuthCallbacks}).
 * 2. **A static token**: `GH_TOKEN` (or the caller's own fallback). With the
 *    broker on, `GH_TOKEN` is the first token the platform minted at deploy,
 *    so it covers a broker outage for up to an hour after a deploy.
 *
 * The site therefore never needs a long-lived git credential, and a
 * compromised site can reach only its own data repo.
 *
 * No `server-only` import on purpose: `node --test` loads this file
 * directly. It is still server code (it reads secrets from `process.env`).
 */

export const SITE_GIT_TOKEN_URL_ENV = 'EVER_WORKS_SITE_GIT_TOKEN_URL';
export const SITE_GIT_TOKEN_SECRET_ENV = 'EVER_WORKS_SITE_GIT_TOKEN_SECRET';

/** isomorphic-git's username for a GitHub token. */
const GIT_USERNAME = 'x-access-token';
/** Refresh this long before the token's own expiry. */
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;
/** After a failed broker call, wait this long before calling it again. */
const FAILURE_BACKOFF_MS = 30_000;
const FETCH_TIMEOUT_MS = 10_000;
/** Used when the broker answers without a parseable `expiresAt`. */
const FALLBACK_TTL_MS = 50 * 60_000;

type Env = Record<string, string | undefined>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface SiteGitAuth {
	username: string;
	password: string;
}

/** The `onAuth` / `onAuthFailure` pair isomorphic-git accepts on every network call. */
export interface SiteGitAuthCallbacks {
	onAuth: () => Promise<SiteGitAuth | undefined>;
	onAuthFailure: (url: string, auth: { password?: string }) => Promise<SiteGitAuth | undefined>;
}

interface CachedToken {
	token: string;
	expiresAtMs: number;
}

let cached: CachedToken | null = null;
let inflight: Promise<string | null> | null = null;
let lastFailureAtMs = 0;

function trimmed(value: string | undefined): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Both broker variables are set. */
export function isSiteGitTokenBrokerConfigured(env: Env = process.env): boolean {
	return Boolean(trimmed(env[SITE_GIT_TOKEN_URL_ENV]) && trimmed(env[SITE_GIT_TOKEN_SECRET_ENV]));
}

/**
 * Whether the site has ANY way to authenticate to its data repo. Use this
 * where code used to test `process.env.GH_TOKEN`.
 */
export function hasSiteGitCredentials(env: Env = process.env, fallbackToken?: string): boolean {
	return isSiteGitTokenBrokerConfigured(env) || Boolean(trimmed(env.GH_TOKEN)) || Boolean(trimmed(fallbackToken));
}

async function fetchFromBroker(env: Env, fetchImpl: FetchLike): Promise<CachedToken> {
	const url = trimmed(env[SITE_GIT_TOKEN_URL_ENV]);
	const secret = trimmed(env[SITE_GIT_TOKEN_SECRET_ENV]);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetchImpl(url, {
			method: 'POST',
			headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
			signal: controller.signal,
			cache: 'no-store'
		});
		if (!response.ok) {
			throw new Error(`site git token broker answered ${response.status}`);
		}
		const body = (await response.json()) as { token?: unknown; expiresAt?: unknown };
		const token = typeof body.token === 'string' ? body.token.trim() : '';
		if (!token) throw new Error('site git token broker answered without a token');
		const parsed = typeof body.expiresAt === 'string' ? Date.parse(body.expiresAt) : Number.NaN;
		return { token, expiresAtMs: Number.isFinite(parsed) ? parsed : Date.now() + FALLBACK_TTL_MS };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * The token to use right now, or '' when there is none.
 *
 * Broker configured: a cached broker token while it has more than five
 * minutes left, else a fresh one. If the broker fails, a cached token that
 * has not expired yet, else the static token. Without the broker: the static
 * token (`fallbackToken`, else `GH_TOKEN`).
 */
export async function getSiteGitToken(
	options: { forceRefresh?: boolean; fallbackToken?: string; env?: Env; fetchImpl?: FetchLike } = {}
): Promise<string> {
	const env = options.env ?? process.env;
	const staticToken = trimmed(options.fallbackToken) || trimmed(env.GH_TOKEN);
	if (!isSiteGitTokenBrokerConfigured(env)) return staticToken;

	const now = Date.now();
	if (!options.forceRefresh && cached && cached.expiresAtMs - now > REFRESH_BEFORE_EXPIRY_MS) {
		return cached.token;
	}
	// Back off after a failure so a broker outage is not hammered by every
	// request; a forced refresh (GitHub just said 401) still tries.
	if (!options.forceRefresh && lastFailureAtMs && now - lastFailureAtMs < FAILURE_BACKOFF_MS) {
		return cached && cached.expiresAtMs > now ? cached.token : staticToken;
	}

	if (!inflight) {
		const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
		inflight = fetchFromBroker(env, fetchImpl)
			.then((fresh) => {
				cached = fresh;
				lastFailureAtMs = 0;
				return fresh.token;
			})
			.catch((error: unknown) => {
				lastFailureAtMs = Date.now();
				// Never log the secret or a token; the status is enough.
				console.warn(
					`[site-git-token] broker refresh failed: ${error instanceof Error ? error.message : String(error)}`
				);
				return null;
			})
			.finally(() => {
				inflight = null;
			});
	}
	const fresh = await inflight;
	if (fresh) return fresh;
	return cached && cached.expiresAtMs > Date.now() ? cached.token : staticToken;
}

/** Drop the cached broker token (tests, or after the platform rotates the site secret). */
export function resetSiteGitTokenCache(): void {
	cached = null;
	inflight = null;
	lastFailureAtMs = 0;
}

/**
 * `onAuth` / `onAuthFailure` for isomorphic-git. Spread it into a call:
 * `git.push({ ...siteGitAuthCallbacks(token), fs, http, dir })`.
 *
 * `onAuth` resolves the token when GitHub first asks (so a long-running
 * process always presents a current one). `onAuthFailure` runs when GitHub
 * rejected it: it forces ONE broker refresh and retries only if that
 * produced a different token. Returning nothing stops isomorphic-git's
 * retry loop, which otherwise keeps calling `onAuthFailure`.
 */
export function siteGitAuthCallbacks(
	fallbackToken?: string,
	options: { env?: Env; fetchImpl?: FetchLike } = {}
): SiteGitAuthCallbacks {
	const toAuth = (token: string): SiteGitAuth | undefined =>
		token ? { username: GIT_USERNAME, password: token } : undefined;
	return {
		onAuth: async () => toAuth(await getSiteGitToken({ fallbackToken, ...options })),
		onAuthFailure: async (_url, failed) => {
			if (!isSiteGitTokenBrokerConfigured(options.env ?? process.env)) return undefined;
			const fresh = await getSiteGitToken({ fallbackToken, forceRefresh: true, ...options });
			if (!fresh || fresh === failed?.password) return undefined;
			return toAuth(fresh);
		}
	};
}
